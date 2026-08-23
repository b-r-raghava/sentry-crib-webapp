import { DetectedObject, SafetyContextResult, OverallSafetyState, BoundingBoxNormalized } from '../types/detection';

export interface SafetyEngineOptions {
  toddlerSafetyRadiusPct?: number; // Normalized image-space radius (e.g. 30% of frame)
  dangerConfirmationDurationMs?: number; // Continuous danger duration before confirmation (default: 5000ms / 5s)
}

export class SafetyContextEngine {
  private toddlerSafetyRadiusPct: number = 30; // 30% of normalized viewport
  private dangerConfirmationDurationMs: number = 5000; // 5000ms (5 seconds) default confirmation threshold
  private dangerStartTime: number | null = null;
  private lastDangerSeenTime: number | null = null;
  private isDangerConfirmed: boolean = false;

  constructor(options?: SafetyEngineOptions) {
    if (options?.toddlerSafetyRadiusPct) this.toddlerSafetyRadiusPct = options.toddlerSafetyRadiusPct;
    if (options?.dangerConfirmationDurationMs) this.dangerConfirmationDurationMs = options.dangerConfirmationDurationMs;
  }

  public setToddlerSafetyRadius(radiusPct: number): void {
    this.toddlerSafetyRadiusPct = Math.max(10, Math.min(80, radiusPct));
  }

  public getToddlerSafetyRadius(): number {
    return this.toddlerSafetyRadiusPct;
  }

  public setDangerConfirmationDurationMs(durationMs: number): void {
    this.dangerConfirmationDurationMs = Math.max(1000, Math.min(30000, durationMs));
  }

  public getDangerConfirmationDurationMs(): number {
    return this.dangerConfirmationDurationMs;
  }

  public resetDangerState(): void {
    this.dangerStartTime = null;
    this.lastDangerSeenTime = null;
    this.isDangerConfirmed = false;
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
    // 1. Identify active entities
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

    // =========================================================================
    // RULE 1: PERSON + SHARP OBJECT SPATIAL ASSOCIATION (NO TODDLER REQUIRED)
    // =========================================================================
    let hasPersonHoldingSharp = false;
    let heldSharpName = 'sharp object';

    for (const sharp of sharpHazards) {
      for (const person of allPersons) {
        const centerDist = this.computeCenterDistancePct(person.box, sharp.box);

        // Bounding box intersection check
        const interLeft = Math.max(person.box.left, sharp.box.left);
        const interRight = Math.min(person.box.left + person.box.width, sharp.box.left + sharp.box.width);
        const interTop = Math.max(person.box.top, sharp.box.top);
        const interBottom = Math.min(person.box.top + person.box.height, sharp.box.top + sharp.box.height);
        const isIntersecting = interRight > interLeft && interBottom > interTop;

        // Arm / hand reach boundary check (Person bounding box expanded by 10%)
        const sharpCenterX = sharp.box.left + sharp.box.width / 2;
        const sharpCenterY = sharp.box.top + sharp.box.height / 2;
        const inPersonReach =
          sharpCenterX >= (person.box.left - 10) &&
          sharpCenterX <= (person.box.left + person.box.width + 10) &&
          sharpCenterY >= (person.box.top - 10) &&
          sharpCenterY <= (person.box.top + person.box.height + 10);

        if (isIntersecting || inPersonReach || centerDist <= 30) {
          hasPersonHoldingSharp = true;
          sharp.inProximityDanger = true;
          person.inProximityDanger = true;
          heldSharpName = sharp.displayName;

          proximityEvents.push({
            id: `prox-holding-${sharp.trackingId}-${person.trackingId}`,
            type: 'sharp_hazard',
            targetName: `${person.displayName} with ${sharp.displayName}`,
            distancePct: Math.round(centerDist),
            isDanger: true,
            isAttention: false,
            description: `Person holding ${sharp.displayName} (${Math.round(centerDist)}% reach distance)`
          });
          break;
        }
      }
    }

    // =========================================================================
    // RULE 2: TODDLER PROXIMITY RELATIONSHIPS (IF TODDLER IS IN FRAME)
    // =========================================================================
    let hasUnrecognisedNearToddler = false;
    let hasRecognisedCaregiverNearToddler = false;
    let hasAnimalNearToddler = false;

    if (toddler) {
      // Evaluate Persons Proximity to Toddler
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
            hasUnrecognisedNearToddler = true;
          }
        }
      }

      // Evaluate Animal Proximity to Toddler
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
    }

    // =========================================================================
    // SAFETY RULE DECISION HIERARCHY
    // =========================================================================
    let overallState: OverallSafetyState = 'SAFE';
    let headline = 'Monitored Space Safe';
    let description = 'System active. Monitored space clear of immediate hazards.';
    let activeRuleCase: SafetyContextResult['activeRuleCase'] = 'CASE_E_NO_TODDLER';

    // Priority 1: Person holding a sharp object (NO toddler required)
    if (hasPersonHoldingSharp) {
      overallState = 'DANGER';
      headline = 'Person Holding Sharp Object';
      description = 'Person holding a sharp object for more than 5 seconds.';
      activeRuleCase = 'SHARP_HAZARD_DANGER';
    }
    // Priority 2: Unrecognised Person near Toddler without caregiver
    else if (toddler && hasUnrecognisedNearToddler && !hasRecognisedCaregiverNearToddler) {
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
    }
    // Priority 3: Sharp object lying in space (not held by person)
    else if (sharpHazards.length > 0) {
      overallState = 'ATTENTION';
      headline = 'Sharp Hazard in Monitored Space';
      description = `${sharpHazards.length} sharp hazard(s) active in camera frame.`;
      activeRuleCase = 'SHARP_HAZARD_DANGER';
    }
    // Priority 4: Caregiver accompanied by visitor near toddler
    else if (toddler && hasUnrecognisedNearToddler && hasRecognisedCaregiverNearToddler) {
      overallState = 'ATTENTION';
      headline = 'Caregiver Accompanied by Visitor';
      description = 'An unrecognised person is present near toddler, accompanied by an enrolled caregiver.';
      activeRuleCase = 'CASE_B_CARE_VISITOR';
    }
    // Priority 5: Animal near toddler
    else if (toddler && hasAnimalNearToddler) {
      overallState = 'ATTENTION';
      headline = 'Animal Near Toddler';
      description = 'Household animal has entered the toddler proximity zone.';
      activeRuleCase = 'ANIMAL_ALERT';
    }
    // Priority 6: Toddler resting safely with caregiver
    else if (toddler && hasRecognisedCaregiverNearToddler) {
      overallState = 'SAFE';
      headline = 'Caregiver Attending';
      description = 'Toddler is in direct company of an authorised caregiver.';
      activeRuleCase = 'CASE_C_KNOWN_ONLY';
    }
    // Priority 7: Toddler resting safely alone
    else if (toddler) {
      overallState = 'SAFE';
      headline = 'Toddler Monitored';
      description = 'Toddler is resting peacefully in safe space.';
      activeRuleCase = 'CASE_D_SOLO_TODDLER';
    }
    // Priority 8: Space clear / No toddler
    else {
      overallState = 'SAFE';
      headline = 'Monitored Space Clear';
      description = 'Nursery space active. No enrolled toddler currently in frame.';
      activeRuleCase = 'CASE_E_NO_TODDLER';
    }

    // =========================================================================
    // 5-SECOND CONTINUOUS DANGER PERSISTENCE & CONFIRMATION
    // =========================================================================
    let currentDangerDuration = 0;

    if (overallState === 'DANGER') {
      if (this.dangerStartTime === null) {
        this.dangerStartTime = currentTime;
        this.lastDangerSeenTime = currentTime;
        this.isDangerConfirmed = false;
        currentDangerDuration = 0;
      } else {
        this.lastDangerSeenTime = currentTime;
        currentDangerDuration = Math.max(0, currentTime - this.dangerStartTime);
        if (currentDangerDuration >= this.dangerConfirmationDurationMs) {
          this.isDangerConfirmed = true;
        }
      }
    } else {
      // Jitter tolerance: Allow up to 400ms detection dropout before resetting continuous timer
      const timeSinceLastDanger = this.lastDangerSeenTime ? (currentTime - this.lastDangerSeenTime) : Infinity;
      if (this.dangerStartTime !== null && timeSinceLastDanger < 400) {
        currentDangerDuration = Math.max(0, currentTime - this.dangerStartTime);
        if (currentDangerDuration >= this.dangerConfirmationDurationMs) {
          this.isDangerConfirmed = true;
        }
      } else {
        // Danger condition disappeared or resolved: reset persistence tracker
        this.resetDangerState();
        currentDangerDuration = 0;
      }
    }

    return {
      overallState,
      isDangerConfirmed: this.isDangerConfirmed,
      dangerDurationMs: currentDangerDuration,
      dangerConfirmationThresholdMs: this.dangerConfirmationDurationMs,
      statusHeadline: headline,
      statusDescription: description,
      toddlerDetected: Boolean(toddler),
      toddlerTrackId: toddler?.trackingId,
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
