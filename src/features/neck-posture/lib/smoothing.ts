/** Exponential moving average — one small stateful smoother per signal. */
export class Ema {
  private value: number | null = null
  private readonly alpha: number

  constructor(alpha: number) {
    this.alpha = alpha
  }

  push(sample: number): number {
    this.value =
      this.value === null ? sample : this.alpha * sample + (1 - this.alpha) * this.value
    return this.value
  }

  get current(): number | null {
    return this.value
  }

  reset(): void {
    this.value = null
  }
}
