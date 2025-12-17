/**
 * Calculate Exponential Moving Average (EMA)
 */
export function calculateEMA(data: number[], period: number): (number | null)[] {
    const result: (number | null)[] = [];
    const multiplier = 2 / (period + 1);

    let ema: number | null = null;

    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            result.push(null);
        } else if (i === period - 1) {
            // First EMA is SMA
            const sum = data.slice(0, period).reduce((a, b) => a + b, 0);
            ema = sum / period;
            result.push(ema);
        } else {
            ema = (data[i] - ema!) * multiplier + ema!;
            result.push(ema);
        }
    }

    return result;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(
    data: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
): {
    macdLine: (number | null)[];
    signalLine: (number | null)[];
    histogram: (number | null)[];
} {
    const fastEMA = calculateEMA(data, fastPeriod);
    const slowEMA = calculateEMA(data, slowPeriod);

    // MACD Line = Fast EMA - Slow EMA
    const macdLine: (number | null)[] = fastEMA.map((fast, i) => {
        const slow = slowEMA[i];
        if (fast === null || slow === null) return null;
        return fast - slow;
    });

    // Signal Line = EMA of MACD Line
    const validMacdValues = macdLine.filter((v): v is number => v !== null);
    const signalEMA = calculateEMA(validMacdValues, signalPeriod);

    // Map signal EMA back to full array
    const signalLine: (number | null)[] = [];
    let signalIdx = 0;
    for (let i = 0; i < macdLine.length; i++) {
        if (macdLine[i] === null) {
            signalLine.push(null);
        } else {
            signalLine.push(signalEMA[signalIdx] ?? null);
            signalIdx++;
        }
    }

    // Histogram = MACD Line - Signal Line
    const histogram: (number | null)[] = macdLine.map((macd, i) => {
        const signal = signalLine[i];
        if (macd === null || signal === null) return null;
        return macd - signal;
    });

    return { macdLine, signalLine, histogram };
}

/**
 * Calculate Relative Strength Index (RSI)
 */
export function calculateRSI(data: number[], period: number = 14): (number | null)[] {
    const result: (number | null)[] = [];

    if (data.length < period + 1) {
        return data.map(() => null);
    }

    // Calculate price changes
    const changes: number[] = [];
    for (let i = 1; i < data.length; i++) {
        changes.push(data[i] - data[i - 1]);
    }

    // First value is null (no previous price)
    result.push(null);

    // Calculate initial averages
    let avgGain = 0;
    let avgLoss = 0;

    for (let i = 0; i < period; i++) {
        if (changes[i] > 0) {
            avgGain += changes[i];
        } else {
            avgLoss += Math.abs(changes[i]);
        }
        result.push(null);
    }

    avgGain /= period;
    avgLoss /= period;

    // First RSI
    if (avgLoss === 0) {
        result.push(100);
    } else {
        const rs = avgGain / avgLoss;
        result.push(100 - 100 / (1 + rs));
    }

    // Subsequent RSIs using smoothed averages
    for (let i = period + 1; i < changes.length; i++) {
        const change = changes[i];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;

        if (avgLoss === 0) {
            result.push(100);
        } else {
            const rs = avgGain / avgLoss;
            result.push(100 - 100 / (1 + rs));
        }
    }

    return result;
}

/**
 * Find MACD crossover points
 */
export function findMACDCrossovers(
    macdLine: (number | null)[],
    signalLine: (number | null)[],
    times: number[]
): { time: number; type: "bullish" | "bearish" }[] {
    const crossovers: { time: number; type: "bullish" | "bearish" }[] = [];

    for (let i = 1; i < macdLine.length; i++) {
        const prevMacd = macdLine[i - 1];
        const currMacd = macdLine[i];
        const prevSignal = signalLine[i - 1];
        const currSignal = signalLine[i];

        if (
            prevMacd === null ||
            currMacd === null ||
            prevSignal === null ||
            currSignal === null
        ) {
            continue;
        }

        // Bullish crossover: MACD crosses above signal
        if (prevMacd <= prevSignal && currMacd > currSignal) {
            crossovers.push({ time: times[i], type: "bullish" });
        }
        // Bearish crossover: MACD crosses below signal
        else if (prevMacd >= prevSignal && currMacd < currSignal) {
            crossovers.push({ time: times[i], type: "bearish" });
        }
    }

    return crossovers;
}

/**
 * Find zero-line crossovers for MACD
 */
export function findZeroLineCrossovers(
    macdLine: (number | null)[],
    times: number[]
): { time: number; type: "bullish" | "bearish" }[] {
    const crossovers: { time: number; type: "bullish" | "bearish" }[] = [];

    for (let i = 1; i < macdLine.length; i++) {
        const prevMacd = macdLine[i - 1];
        const currMacd = macdLine[i];

        if (prevMacd === null || currMacd === null) {
            continue;
        }

        // Bullish: MACD crosses above zero
        if (prevMacd <= 0 && currMacd > 0) {
            crossovers.push({ time: times[i], type: "bullish" });
        }
        // Bearish: MACD crosses below zero
        else if (prevMacd >= 0 && currMacd < 0) {
            crossovers.push({ time: times[i], type: "bearish" });
        }
    }

    return crossovers;
}
