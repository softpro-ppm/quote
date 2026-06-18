export interface CoverNote {
  title: string
  body: string
}

export const MOTOR_NOTES: CoverNote[] = [
  {
    title: '1. Zero Depreciation Cover (Zero Dep)',
    body:
      'The Zero Depreciation add-on ensures you receive the full claim amount without any depreciation deduction on replaced parts during a claim. Normally, when parts are repaired or replaced, the insurer deducts depreciation based on the age and type of the part. With this cover, you won\u2019t pay that deduction \u2014 SBI General will cover the complete replacement cost of eligible parts, reducing your out-of-pocket expenses after an accident.',
  },
  {
    title: '2. Engine Guard Cover (Engine Protection)',
    body:
      'Engine Guard protects the vehicle\u2019s engine and related components against accidental damage due to water ingression, lubricant leakage, or hydrostatic lock. It helps avoid high repair costs and is especially useful in monsoon or flood-prone conditions.',
  },
  {
    title: '3. Consumables Cover',
    body:
      'Standard car insurance does not cover the cost of consumables such as engine oil, lubricant, nuts, bolts, filters, etc. If your vehicle is in an accident and needs repair, these items must often be replaced, adding to your bill. The Consumables Cover reimburses you for these expenses, making repair claims more comprehensive.',
  },
  {
    title: '4. Return to Invoice Cover',
    body:
      'In case of total loss or theft, Return to Invoice pays the original purchase invoice value instead of the depreciated IDV. This helps the policyholder replace the vehicle without financial loss due to depreciation.',
  },
  {
    title: '5. Tyre & Rim Cover',
    body:
      'Damage to tyres and rims is normally not covered under standard own damage insurance. The Tyre & Rim Cover helps pay for repair or replacement costs if your tyres, tubes or rims are damaged due to an accident. This add-on means you won\u2019t have to pay out-of-pocket when these important components are affected by collision-related impacts.',
  },
  {
    title: '6. Key+PB+RSA Cover',
    body:
      'If your car\u2019s keys are lost, stolen, or broken, replacing modern vehicle keys \u2014 especially remote or smart keys \u2014 can be expensive. With this add-on, SBI General will reimburse you for the cost of replacing the keys and associated locks (subject to policy terms). This gives you financial relief when key loss would otherwise be a significant expense.',
  },
  {
    title: '7. Personal Belongings',
    body: 'Covers loss or damage to personal items kept inside the vehicle due to theft or accidental damage.',
  },
  {
    title: '8. Roadside Assistance',
    body:
      'Provides emergency support such as towing, breakdown assistance, battery jump-start, fuel delivery, and minor on-site repairs.',
  },
]

export const EV_NOTES: CoverNote[] = [
  MOTOR_NOTES[0],
  {
    title: '2. Battery & Wall Charger Protection Cover',
    body:
      'This add-on provides protection for electric vehicle battery-related components and wall charger accessories, subject to policy terms and conditions. It helps cover repair or replacement costs arising from accidental damage to the EV battery system, charging equipment.',
  },
  { ...MOTOR_NOTES[2], title: '3. Consumables Cover' },
  { ...MOTOR_NOTES[3], title: '4. Return to Invoice Cover' },
  { ...MOTOR_NOTES[4], title: '5. Tyre & Rim Cover' },
  {
    title: '6. Key + PB + RSA Cover',
    body: MOTOR_NOTES[5].body,
  },
  { ...MOTOR_NOTES[6], title: '7. Personal Belongings' },
  { ...MOTOR_NOTES[7], title: '8. Roadside Assistance' },
]
