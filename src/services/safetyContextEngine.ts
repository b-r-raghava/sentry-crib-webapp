import { DetectedObject, SafetyContextResult, OverallSafetyState, BoundingBoxNormalized } from '../types/detection';

export interface SafetyEngineOptions {
  toddlerSafetyRadiusPct?: number; // Normalized image-space radius (e.g. 30% of frame)
}

export class SafetyContextEngine {
  private toddlerSafetyRadiusPct: number = 30; // 30% of normalized viewport

  constructor(options?: SafetyEngineOptions) {
    if (options?.toddlerSafetyRadiusPct) this.toddlerSafetyRadiusPct = options.toddlerSafetyRadiusPct;
  }

  public setToddlerSafetyRadius(radiusPct: number): void {
    this.toddlerSafetyRadiusPct = Math.max(10, Math.min(80, radiusPct));
  }

  public getToddlerSafetyRadius(): number {
    return this.toddlerSafetyRadiusPct;
  }

  // Calculate normalized Euclidean distance between two bounding box centers (0 to 100%)
  public computeCenterDistancePct(boxA: BoundingBoxNormalized, boxB: BoundingBoxNormalized): number {
    const centerAX = boxA.left + boxA.width / 2;
    const centerAY = boxA.top + boxA.height / 2;
    const centerBX = boxB.left + boxB.width / 2;
    const centerBY = boxB.top + boxB.height / 2;

    const dx = centerAX - centerBX;
    const dy = centerAY - centerBY;

    return Math.sqrt(dx * dx + dy * dy);
  }

  // Evaluate safety context across all active tracked objects using FINAL identity states
  public evaluateSafetyContext(
    trackedObjects: DetectedObject[],
    currentTime: number = Date.now()
  ): SafetyContextResult {
    // 1. Identify active Toddler (Strict: identityState === 'TODDLER')
    const toddler = trackedObjects.find(
      obj => obj.className === 'person' && obj.identity?.identityState === 'TODDLER'
    );

    const allPersons = trackedObjects.filter(obj => obj.className === 'person');
    const recognisedPersons = allPersons.filter(
      p => p.identity?.identityState === 'RECOGNISED' && p.id !== toddler?.id
    );
    const unrecognisedPersons = allPersons.filter(
      p => (p.identity?.identityState === 'UNRECOGNISED' || p.identity?.identityState === 'UNKNOWN') && p.id !== toddler?.id
    );
    const unconfirmedPersons = allPersons.filter(
      p => p.identity?.identityState === 'UNCONFIRMED' && p.id !== toddler?.id
    );
    const animals = trackedObjects.filter(obj => obj.isAnimal);
    const sharpHazards = trackedObjects.filter(obj => obj.isSharpHazard);

    // Reset per-object proximity flags
    trackedObjects.forEach(obj => {
      obj.inProximityDanger = false;
      obj.inProximityAttention = false;
      obj.proximityDistanceToToddlerPct = undefined;
    });

    const proximityEvents: SafetyContextResult['proximityEvents'] = [];

    // CASE E: No toddler detected in camera frame
    if (!toddler) {
      if (sharpHazards.length > 0) {
        return {
          overallState: 'ATTENTION',
          statusHeadline: 'Sharp Hazard in Monitored Space',
          statusDescription: `${sharpHazards.length} sharp hazard(s) active in camera frame.`,
          toddlerDetected: false,
          recognisedPersonsCount: recognisedPersons.length,
          unrecognisedPersonsCount: unrecognisedPersons.length,
          unconfirmedPersonsCount: unconfirmedPersons.length,
          animalsCount: animals.length,
          sharpHazardsCount: sharpHazards.length,
          proximityEvents: [],
          activeRuleCase: 'SHARP_HAZARD_DANGER'
        };
      }

      return {
        overallState: 'SAFE',
        statusHeadline: 'Monitored Space Clear',
        statusDescription: 'Nursery space active. No enrolled toddler currently in frame.',
        toddlerDetected: false,
        recognisedPersonsCount: recognisedPersons.length,
        unrecognisedPersonsCount: unrecognisedPersons.length,
        unconfirmedPersonsCount: unconfirmedPersons.length,
        animalsCount: animals.length,
        sharpHazardsCount: 0,
        proximityEvents: [],
        activeRuleCase: 'CASE_E_NO_TODDLER'
      };
    }

    // Toddler is present: Calculate spatial relationships
    let hasSharpHazardInReach = false;
    let hasUnrecognisedNearToddler = false;
    let hasRecognisedCaregiverNearToddler = false;
    let hasAnimalNearToddler = false;

    // A. Evaluate Sharp Hazard Proximity to Toddler
    for (const sharp of sharpHazards) {
      const dist = this.computeCenterDistancePct(toddler.box, sharp.box);
      sharp.proximityDistanceToToddlerPct = Math.round(dist);

      if (dist <= this.toddlerSafetyRadiusPct) {
        hasSharpHazardInReach = true;
        sharp.inProximityDanger = true;
        proximityEvents.push({
          id: `prox-sharp-${sharp.trackingId}`,
          type: 'sharp_hazard',
          targetName: sharp.displayName,
          distancePct: Math.round(dist),
          isDanger: true,
          isAttention: false,
          description: `Sharp hazard (${sharp.displayName}) within toddler reach (${Math.round(dist)}% distance)`
        });
      }
    }

    // B. Evaluate Persons Proximity to Toddler
    for (const person of allPersons) {
      if (person.id === toddler.id) continue;

      const dist = this.computeCenterDistancePct(toddler.box, person.box);
      person.proximityDistanceToToddlerPct = Math.round(dist);

      const isNearby = dist <= this.toddlerSafetyRadiusPct;

      if (isNearby) {
        if (person.identity?.identityState === 'RECOGNISED') {
          hasRecognisedCaregiverNearToddler = true;
          proximityEvents.push({
            id: `prox-caregiver-${person.trackingId}`,
            type: 'caregiver_present',
            targetName: person.displayName,
            distancePct: Math.round(dist),
            isDanger: false,
            isAttention: false,
            description: `Recognised caregiver (${person.displayName}) near toddler`
          });
        } else {
          // Both UNRECOGNISED and UNCONFIRMED count as unknown visitors near toddler
          hasUnrecognisedNearToddler = true;
        }
      }
    }

    // C. Evaluate Animal Proximity to Toddler
    for (const animal of animals) {
      const dist = this.computeCenterDistancePct(toddler.box, animal.box);
      animal.proximityDistanceToToddlerPct = Math.round(dist);

      if (dist <= this.toddlerSafetyRadiusPct) {
        hasAnimalNearToddler = true;
        animal.inProximityAttention = true;
        proximityEvents.push({
          id: `prox-animal-${animal.trackingId}`,
          type: 'animal',
          targetName: animal.displayName,
          distancePct: Math.round(dist),
          isDanger: false,
          isAttention: true,
          description: `Household animal (${animal.displayName}) near toddler space (${Math.round(dist)}% distance)`
        });
      }
    }

    // D. Evaluate Safety Rule Decisions
    let overallState: OverallSafetyState = 'SAFE';
    let headline = 'Toddler Safe';
    let description = 'Toddler is in calibrated safe space with no hazards.';
    let activeRuleCase: SafetyContextResult['activeRuleCase'] = 'CASE_D_SOLO_TODDLER';

    // Priority 1: Direct Sharp Hazard Reach
    if (hasSharpHazardInReach) {
      overallState = 'DANGER';
      headline = 'Sharp Hazard Near Toddler';
      description = 'Immediate caregiver intervention advised: sharp object within infant reach.';
      activeRuleCase = 'SHARP_HAZARD_DANGER';
    }
    // Priority 2: Unrecognised Person Spatial Rule
    else if (hasUnrecognisedNearToddler) {
      if (!hasRecognisedCaregiverNearToddler) {
        // CASE A: Toddler + UNRECOGNISED + NO RECOGNISED caregiver nearby -> DANGER
        overallState = 'DANGER';
        headline = 'Unrecognised Person Near Toddler';
        description = 'An unrecognised person has entered the toddler proximity radius with no authorised caregiver present.';
        activeRuleCase = 'CASE_A_STRANGER_DANGER';

        const unknownList = [...unrecognisedPersons, ...unconfirmedPersons];
        for (const p of unknownList) {
          if ((p.proximityDistanceToToddlerPct || 100) <= this.toddlerSafetyRadiusPct) {
            p.inProximityDanger = true;
            proximityEvents.push({
              id: `prox-stranger-${p.trackingId}`,
              type: 'unrecognised_person',
              targetName: p.displayName || 'UNRECOGNISED Person',
              distancePct: p.proximityDistanceToToddlerPct || 0,
              isDanger: true,
              isAttention: false,
              description: `Unrecognised person in toddler proximity zone (${p.proximityDistanceToToddlerPct}% distance)`
            });
          }
        }
      } else {
        // CASE B: Toddler + UNRECOGNISED + RECOGNISED caregiver nearby -> ATTENTION (Danger suppressed)
        overallState = 'ATTENTION';
        headline = 'Caregiver Accompanied by Visitor';
        description = 'An unrecognised person is present near toddler, accompanied by an enrolled caregiver.';
        activeRuleCase = 'CASE_B_CARE_VISITOR';

        const unknownList = [...unrecognisedPersons, ...unconfirmedPersons];
        for (const p of unknownList) {
          if ((p.proximityDistanceToToddlerPct || 100) <= this.toddlerSafetyRadiusPct) {
            p.inProximityAttention = true;
            proximityEvents.push({
              id: `prox-visitor-${p.trackingId}`,
              type: 'unrecognised_person',
              targetName: 'Unrecognised Visitor',
              distancePct: p.proximityDistanceToToddlerPct || 0,
              isDanger: false,
              isAttention: true,
              description: `Visitor near toddler accompanied by authorised caregiver`
            });
          }
        }
      }
    }
    // Priority 3: Animal Proximity Rule
    else if (hasAnimalNearToddler) {
      overallState = 'ATTENTION';
      headline = 'Animal Near Toddler';
      description = 'Household animal has entered the toddler proximity zone.';
      activeRuleCase = 'ANIMAL_ALERT';
    }
    // Priority 4: Recognised Caregiver Only
    else if (hasRecognisedCaregiverNearToddler) {
      overallState = 'SAFE';
      headline = 'Caregiver Attending';
      description = 'Toddler is in direct company of an authorised caregiver.';
      activeRuleCase = 'CASE_C_KNOWN_ONLY';
    } else {
      // CASE D: Solo Toddler with no nearby persons
      overallState = 'SAFE';
      headline = 'Toddler Monitored';
      description = 'Toddler is resting peacefully in safe space.';
      activeRuleCase = 'CASE_D_SOLO_TODDLER';
    }

    return {
      overallState,
      statusHeadline: headline,
      statusDescription: description,
      toddlerDetected: true,
      toddlerTrackId: toddler.trackingId,
      recognisedPersonsCount: recognisedPersons.length,
      unrecognisedPersonsCount: unrecognisedPersons.length,
      unconfirmedPersonsCount: unconfirmedPersons.length,
      animalsCount: animals.length,
      sharpHazardsCount: sharpHazards.length,
      proximityEvents,
      activeRuleCase
    };
  }
}

export const safetyContextEngine = new SafetyContextEngine();
