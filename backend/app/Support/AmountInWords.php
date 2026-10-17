<?php

namespace App\Support;

/**
 * Rupee amounts in words for printed bills, e.g. 320000 → "Three Hundred And Twenty Thousand Rupees Only".
 */
class AmountInWords
{
    private const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
        'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    private const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    private const SCALES = [1_000_000_000 => 'Billion', 1_000_000 => 'Million', 1_000 => 'Thousand'];

    public static function rupees(float $amount): string
    {
        $cents = (int) round($amount * 100);
        $rupees = intdiv($cents, 100);
        $cents %= 100;

        $words = ($rupees === 0 ? 'Zero' : self::integer($rupees)).' Rupees';
        if ($cents > 0) {
            $words .= ' And '.self::integer($cents).' Cents';
        }

        return $words.' Only';
    }

    private static function integer(int $n): string
    {
        $parts = [];
        foreach (self::SCALES as $value => $name) {
            if ($n >= $value) {
                $parts[] = self::belowThousand(intdiv($n, $value)).' '.$name;
                $n %= $value;
            }
        }
        if ($n > 0) {
            $parts[] = self::belowThousand($n);
        }

        return implode(' ', $parts);
    }

    private static function belowThousand(int $n): string
    {
        $words = [];
        if ($n >= 100) {
            $words[] = self::ONES[intdiv($n, 100)].' Hundred';
            $n %= 100;
            if ($n > 0) {
                $words[] = 'And';
            }
        }
        if ($n >= 20) {
            $words[] = trim(self::TENS[intdiv($n, 10)].' '.self::ONES[$n % 10]);
        } elseif ($n > 0) {
            $words[] = self::ONES[$n];
        }

        return implode(' ', $words);
    }
}
