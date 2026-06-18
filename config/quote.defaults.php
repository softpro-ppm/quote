<?php

// Canonical default rate configuration for the SBI Quote app.
// Source: Motor / Electrical engine rating sheet (Zone A/B, NCB>0 and NCB=0 tables).

$motorNcbPositive = [
    'Zero Dep' => [
        'Gold' => ['type' => 'percentOfIdv', 'rate' => 0.23],
        'Gold+' => ['type' => 'percentOfIdv', 'rate' => 0.23],
        'Platinum' => ['type' => 'percentOfIdv', 'rate' => 0.23],
    ],
    'Engine Protection' => [
        'Gold' => ['type' => 'na'],
        'Gold+' => ['type' => 'percentOfIdv', 'rate' => 0.06],
        'Platinum' => ['type' => 'percentOfIdv', 'rate' => 0.06],
    ],
    'Consumables' => [
        'Gold' => ['type' => 'na'],
        'Gold+' => ['type' => 'percentOfIdv', 'rate' => 0.08],
        'Platinum' => ['type' => 'percentOfIdv', 'rate' => 0.08],
    ],
    'Return to Invoice' => [
        'Gold' => ['type' => 'na'],
        'Gold+' => ['type' => 'na'],
        'Platinum' => ['type' => 'percentOfIdv', 'rate' => 0.13],
    ],
    'Tyre & Rim' => [
        'Gold' => ['type' => 'na'],
        'Gold+' => ['type' => 'na'],
        'Platinum' => ['type' => 'percentOfIdv', 'rate' => 0.11],
    ],
    'Key+PB+RSA' => [
        'Gold' => ['type' => 'fixed', 'amount' => 880],
        'Gold+' => ['type' => 'fixed', 'amount' => 880],
        'Platinum' => ['type' => 'fixed', 'amount' => 880],
    ],
];

$motorNcbZero = [
    'Zero Dep' => [
        'Gold' => ['type' => 'percentOfIdv', 'rate' => 0.154],
        'Gold+' => ['type' => 'percentOfIdv', 'rate' => 0.154],
        'Platinum' => ['type' => 'percentOfIdv', 'rate' => 0.154],
    ],
    'Engine Protection' => [
        'Gold' => ['type' => 'na'],
        'Gold+' => ['type' => 'percentOfIdv', 'rate' => 0.072],
        'Platinum' => ['type' => 'percentOfIdv', 'rate' => 0.072],
    ],
    'Consumables' => [
        'Gold' => ['type' => 'na'],
        'Gold+' => ['type' => 'percentOfIdv', 'rate' => 0.083],
        'Platinum' => ['type' => 'percentOfIdv', 'rate' => 0.083],
    ],
    'Return to Invoice' => [
        'Gold' => ['type' => 'na'],
        'Gold+' => ['type' => 'na'],
        'Platinum' => ['type' => 'percentOfIdv', 'rate' => 0.19],
    ],
    'Tyre & Rim' => [
        'Gold' => ['type' => 'na'],
        'Gold+' => ['type' => 'na'],
        'Platinum' => ['type' => 'percentOfIdv', 'rate' => 0.108],
    ],
    'Key+PB+RSA' => [
        'Gold' => ['type' => 'fixed', 'amount' => 880],
        'Gold+' => ['type' => 'fixed', 'amount' => 880],
        'Platinum' => ['type' => 'fixed', 'amount' => 880],
    ],
];

$evNcbPositive = [
    'Zero Dep' => [
        'Gold' => ['type' => 'percentOfIdv', 'rate' => 0.31],
        'Gold+' => ['type' => 'percentOfIdv', 'rate' => 0.31],
        'Platinum' => ['type' => 'percentOfIdv', 'rate' => 0.31],
    ],
    'Engine Protection' => [
        'Gold' => ['type' => 'na'],
        'Gold+' => ['type' => 'na'],
        'Platinum' => ['type' => 'na'],
    ],
    'Battery Protection' => [
        'Gold' => ['type' => 'na'],
        'Gold+' => ['type' => 'percentOfIdv', 'rate' => 0.22],
        'Platinum' => ['type' => 'percentOfIdv', 'rate' => 0.22],
    ],
    'Consumables' => [
        'Gold' => ['type' => 'na'],
        'Gold+' => ['type' => 'percentOfIdv', 'rate' => 0.01],
        'Platinum' => ['type' => 'percentOfIdv', 'rate' => 0.01],
    ],
    'Return to Invoice' => [
        'Gold' => ['type' => 'na'],
        'Gold+' => ['type' => 'na'],
        'Platinum' => ['type' => 'percentOfIdv', 'rate' => 0.18],
    ],
    'Tyre & Rim' => [
        'Gold' => ['type' => 'na'],
        'Gold+' => ['type' => 'na'],
        'Platinum' => ['type' => 'percentOfIdv', 'rate' => 0.14],
    ],
    'Key+PB+RSA' => [
        'Gold' => ['type' => 'fixed', 'amount' => 880],
        'Gold+' => ['type' => 'fixed', 'amount' => 880],
        'Platinum' => ['type' => 'fixed', 'amount' => 880],
    ],
];

// Electrical Table B (NCB = 0) matches motor Table B; Battery Protection not applicable.
$evNcbZero = array_merge($motorNcbZero, [
    'Battery Protection' => [
        'Gold' => ['type' => 'na'],
        'Gold+' => ['type' => 'na'],
        'Platinum' => ['type' => 'na'],
    ],
]);

return [
    'defaults' => [
        'gstRate' => 18,
        'plans' => ['Gold', 'Gold+', 'Platinum'],
        'odRateZones' => [
            ['code' => 'A', 'label' => 'Zone A', 'rate' => 3.440],
            ['code' => 'B', 'label' => 'Zone B', 'rate' => 3.343],
        ],
        'tables' => [
            'motor' => [
                'label' => 'Motor (ICE)',
                'addonOrder' => ['Zero Dep', 'Engine Protection', 'Consumables', 'Return to Invoice', 'Tyre & Rim', 'Key+PB+RSA'],
                'ncbPositive' => $motorNcbPositive,
                'ncbZero' => $motorNcbZero,
            ],
            'ev' => [
                'label' => 'Electric (EV)',
                'addonOrder' => ['Zero Dep', 'Engine Protection', 'Battery Protection', 'Consumables', 'Return to Invoice', 'Tyre & Rim', 'Key+PB+RSA'],
                'ncbPositive' => $evNcbPositive,
                'ncbZero' => $evNcbZero,
            ],
        ],
    ],
];
