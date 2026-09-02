---
name: rental-purchase-property-evaluation
description: Independently evaluate and compare rental or purchase properties, separating resident impressions from evidence-based analysis of transport, school assignment, condition, value, and tenancy or ownership risk.
metadata:
  short-description: Compare homes without mixing feelings and facts
---

# Rental & Purchase Property Evaluation

Use this skill to assess one or more homes for renting or buying. It is designed for household decisions where lived experience matters, but must not distort the evidence-based assessment.

## Core outcome

Produce three distinct results, in this order:

1. **Objective property assessment:** What the property is worth considering on verifiable facts alone.
2. **Resident assessment:** What the household likes, dislikes, and needs after a viewing.
3. **Decision synthesis:** Where the two agree or conflict, what must be verified or negotiated, and which option is best for this household.

Do not combine these stages. The objective conclusion must be written and scored before consulting or discussing the resident assessment.

## Required inputs

Ask only for unknown information that materially affects the decision. Accept incomplete data, identify gaps, and lower confidence instead of inventing facts.

```markdown
## Household profile
- Decision: rent / buy
- Household members and ages:
- Expected stay:
- Monthly housing budget (and purchase budget, if applicable):
- Work, school, caregiving, and other recurring destinations:
- Transport modes and maximum acceptable commute:
- Must-haves / deal-breakers:
- Parking, pet, accessibility, religious/community, or other needs:

## Property facts
- Property name or ID:
- Full address or at least neighbourhood/intersection:
- Listing URL and listing date:
- Monthly rent or asking price:
- Deposit, management fee, parking fee, taxes, utilities, and other recurring costs:
- Size: registered, interior, balcony/terrace, and claimed size if they differ:
- Layout, building type, age, floor/total floors, elevator:
- Orientation, windows, light, ventilation, noise:
- Appliances, furnishings, parking, management, rubbish handling:
- Lease / sale terms, subsidy eligibility, household registration eligibility:
- Known repairs, water intrusion, defects, alterations, and landlord/seller promises:

## Resident assessment (keep separate)
- What the household liked:
- What the household disliked or worried about:
- Viewing notes, photos, videos, and questions asked:
- Personal SWOT for transport, school, space/condition, neighbourhood:
```

For a comparison, collect the same fields for every property. Never treat omitted fields as neutral or positive.

## Evidence and data priority

Use the strongest available source for each statement. Label material claims as **verified**, **reported**, **observed**, **estimated**, or **unknown**.

1. Official address, building registration, government school-assignment notice, contract, written landlord/seller commitment, and official transit information.
2. On-site observation, dated photos/video, inspection records, management-office confirmation, and utility/repair evidence.
3. Current listing, agent or landlord statement, maps, and reputable market data.
4. General neighbourhood knowledge or inference. State it as an inference and do not score it as confirmed.

If internet research is available, verify time-sensitive or location-specific claims instead of relying on memory. Cite the source and date checked. For school assignment, confirm the **actual address/door number** against the responsible education authority's current official school-district data. Distance to a school is not evidence of eligibility.

Do not give legal, structural-engineering, or financial-professional certainty. Flag items that require a licensed professional, authority, building management, insurer, lender, or lawyer.

## Workflow

### 1. Normalize the facts

- Separate monthly recurring cost from one-time cost.
- Calculate usable space where possible; mark listed size that includes shared areas or unverified additions.
- Record every promise as: responsible party, scope, completion date, proof/acceptance standard, and post-move-in responsibility.
- Distinguish known defects from no evidence of defects. “Recently renovated” does not prove a building is sound.

### 2. Lock the objective assessment

Do not use resident likes/dislikes, ratings, or preferred ranking in this step. Assess each category independently and provide a concise SWOT:

| Category | What to assess |
|---|---|
| Transport | Door-to-door commute at relevant times; walking safety; station/bus access; driving/parking; dependence on one route; future transit only when sourced. |
| School assignment | Official eligibility by exact address; current rule/date; school options and commuting practicality; enrollment uncertainty. |
| Space & condition | Usable layout, bedroom/privacy needs, storage, light, ventilation, sound, floor/stairs/elevator, building age, defect evidence, and repairability. |
| Neighbourhood | Daily shopping, parks, care/medical access, safety signals, noise/traffic, community quality, flood/slope/industrial exposure, and daily atmosphere. |

Use SWOT precisely:

- **Strengths:** existing, verifiable advantages.
- **Weaknesses:** existing constraints or deficiencies.
- **Opportunities:** plausible improvements or benefits contingent on a stated condition.
- **Threats:** external, future, or unresolved risks.

Then assess cost/value, family fit, management/tenure, parking, and legal/physical risks. Objective analysis must precede the resident section even when the user provided it first.

### 3. Quantify cost and value

For rentals calculate:

```text
Monthly all-in housing cost = rent + management + parking + mandatory recurring charges
Annual all-in cost = monthly all-in housing cost × 12 + unavoidable annual charges
Rent per ping (or m²) = monthly rent ÷ stated size
All-in cost per ping (or m²) = monthly all-in housing cost ÷ usable or stated size
```

State which area figure is used. Compare against similar, current listings or transactions only when location, size definition, building type, age, floor/elevator, furnishing, parking, and condition are sufficiently comparable. A low unit price is not automatically good value if the area is unusable, illegal, or high-risk.

For purchases calculate and clearly separate:

```text
Total acquisition cost = price + taxes + fees + required repairs + necessary furnishing/fit-out
Ongoing monthly cost = mortgage + management + parking + taxes/insurance reserve + expected maintenance reserve
Price per ping (or m²) = price ÷ registered size
```

Do not claim investment return, appreciation, or affordability without relevant evidence and assumptions.

### 4. Grade risks before scoring

Record each risk with its evidence, consequence, probability/confidence, mitigation, owner, and decision effect.

| Grade | Meaning | Usual decision effect |
|---|---|---|
| Critical | Unsafe, illegal, unaffordable, impossible household requirement, or unbounded liability. | Reject or pause until independently resolved. |
| High | Material water, structural, electrical/gas, lease/title, school-assignment, repair, or habitability uncertainty. | Do not recommend without written resolution and verification. |
| Medium | Cost, convenience, aging equipment, parking, noise, or maintenance drawback with a feasible mitigation. | Price in, negotiate, and monitor. |
| Low | Minor, known, tolerable inconvenience or cosmetic issue. | Note; do not let it dominate the result. |

Known risks are not automatically worse than unknown risks; they can be managed only when scope, responsibility, remedy, and verification are clear. Unknown risk should lower confidence, not disappear from the report.

### 5. Score objectively

Use a 0–10 scale and show the evidence for each score. Default weights may be adjusted only to match declared household priorities; show every change.

| Dimension | Rent default | Buy default |
|---|---:|---:|
| Cost/value | 20% | 15% |
| Transport | 15% | 15% |
| Official school assignment | 15% | 15% |
| Space, layout, and condition | 20% | 15% |
| Household fit and daily function | 15% | 15% |
| Neighbourhood and amenities | 10% | 10% |
| Management, tenure, parking, and legal/physical risk | 5% | 15% |

Do not use a weighted average to hide a Critical risk. Present a risk gate alongside the score. A high score with an unresolved High risk is conditional, not a clean recommendation.

### 6. Compare with resident assessment only now

Bring in the resident assessment after the objective report is finalized. For every user-stated drawback, create one of these outcomes:

- **Confirmed:** objective evidence supports it.
- **Partly confirmed:** evidence supports some but not all of it.
- **Unverified:** insufficient evidence; add a verification action.
- **Contradicted:** credible evidence conflicts; explain the source difference without dismissing the lived concern.

No stated drawback may be omitted merely because the model believes another factor is more important. Treat direct viewing observations as valuable evidence, while keeping them separate from independent scoring.

## Mandatory risk checklist

Inspect or explicitly mark each item as verified, reported, observed, unknown, or not applicable.

### Contract, money, and tenure

- All-in monthly cost, deposits, fees, subsidies, and household-registration eligibility.
- Lease term, renewal, early termination, rent increase, subletting, pets, and move-out deductions.
- Landlord/seller identity and authority; written promises; who pays for normal wear, appliances, fixtures, and major repairs.
- For buying: title, encumbrances, permitted use, transaction costs, and financing contingencies.

### Building, safety, and habitability

- Water intrusion, ceiling/wall stains, mould, efflorescence, drainage, flood history, roof/terrace waterproofing, and post-rain inspection.
- Structure, exterior walls, seismic condition where relevant, floor vibration, windows, fire egress, and stair safety.
- Electrical capacity, outlets, wiring age, gas type/piping/ventilation, water pressure, hot water, plumbing, and odour.
- Air-conditioning: count, age, cooling performance, leaks/noise, service records, and exact repair/replacement responsibility.
- Appliances and fixtures: inventory, condition, warranty, and repair responsibility.

### Layout, legality, and operations

- Actual vs registered layout/size; rooftop addition, enclosed balcony, mezzanine, partition, terrace, or other alteration.
- Permit/legality, building-code implications, access, exclusive-use claim, and insurance/eviction/removal risk.
- Top-floor exposure, roof access, illegal rooftop construction, elevator condition, rubbish handling, management, and common-area repairs.
- Parking ownership/availability, vehicle fit, access, fees, and charging/storage rules.

### Location, school, and household use

- Exact official school assignment and rule year; admission conditions and any uncertainty.
- Real travel time at required departure times, last-mile route, weather, children/stroller accessibility, and parking.
- Day/night noise, safety, markets, medical care, parks, care network, traffic, construction, and environmental exposure.
- Number of bedrooms, privacy, storage, child growth, caregiving, accessibility, pets, and expected duration of stay.

## Output format

Deliver results in this sequence. Keep observations, evidence, assumptions, and recommendations distinguishable.

```markdown
# [Property name] — Objective assessment (Rent / Buy)

## Facts and evidence status
| Item | Finding | Status / source | Confidence |
|---|---|---|---|

## Cost and value
- All-in monthly cost:
- Unit-cost calculation and area basis:
- Comparable-market conclusion and limitations:

## Independent SWOT
### Transport
- S:
- W:
- O:
- T:
### School assignment
- S:
- W:
- O:
- T:
### Space and condition
- S:
- W:
- O:
- T:
### Neighbourhood
- S:
- W:
- O:
- T:

## Objective scorecard
| Dimension | Score / 10 | Weight | Evidence-based rationale |
|---|---:|---:|---|
| ... | | | |
| Overall weighted score | | | |

## Risks and required verification
| Risk | Grade | Evidence | Required action / responsible party | Recommendation impact |
|---|---|---|---|---|

## Objective recommendation
**Recommendation:** Strongly recommend / Recommend with conditions / Consider / Do not recommend / Reject

## Resident assessment cross-check (after objective conclusion)
| Resident concern or preference | Objective result | Decision implication |
|---|---|---|

## Family decision synthesis
- Best fit for:
- Trade-offs the household must consciously accept:
- Negotiation and contract terms to obtain in writing:
- Next action:
```

For multi-property comparisons, first present one completed objective assessment per property, then provide a common scorecard, risk-gate status, resident/objective gaps, ranking, and a recommendation that states its conditions. Do not rank a property whose critical facts are missing as if it were fully assessed.

## Bias-control rules

- Do not read, quote, or use subjective notes until the objective conclusion is locked; if they cannot be hidden, explicitly bracket them and avoid referencing them.
- Do not reward attractiveness, a new paint job, a friendly agent, or a vague promise without supporting evidence.
- Do not ignore, downplay, or overwrite a user-identified defect. Confirm, qualify, or create a check for it.
- Do not infer school eligibility from proximity, property legality from appearance, repair coverage from a verbal promise, or absence of leaks from dry weather.
- Do not substitute a generic area reputation for an address-level check.
- Do not use a single composite score as the final decision. Explain the binding risks and household deal-breakers.
- Use the same definitions, cost basis, evidence standards, and weights for every compared property unless a documented difference requires otherwise.
- State uncertainty plainly. A missing fact reduces confidence; it does not improve the property.
