
export class MoonPhaseService {
  getCurrentPhase() {
    const date = new Date();
    const phase = this.calculateMoonPhase(date);
    return {
      phase,
      date: date.toISOString()
    };
  }

  private calculateMoonPhase(date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    const c = Math.floor(year / 100);
    const g = 15 + c - Math.floor(c / 4);
    const j = year - Math.floor(year / 19) * 19;
    const i = (Math.floor(year / 100) - Math.floor(year / 400) - 2) % 7;
    
    const phase = (j * 11 - 14 + Math.floor(j / 3) + i) % 30;
    
    return this.getPhaseDescription(phase);
  }

  private getPhaseDescription(phase: number) {
    if (phase < 3.7) return 'New Moon';
    if (phase < 7.4) return 'Waxing Crescent';
    if (phase < 11.1) return 'First Quarter';
    if (phase < 14.8) return 'Waxing Gibbous';
    if (phase < 18.5) return 'Full Moon';
    if (phase < 22.2) return 'Waning Gibbous';
    if (phase < 25.9) return 'Last Quarter';
    return 'Waning Crescent';
  }
}
