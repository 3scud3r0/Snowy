export class HUD {
  constructor() {
    const $ = s => document.querySelector(s);
    this.start = $('#start-screen');
    this.finish = $('#finish-screen');
    this.finalGrade = $('#final-grade');
    this.finalStats = $('#final-stats');
    this.speed = $('#speed');
    this.flow = $('#flow');
    this.flowBar = $('#flow-bar');
    this.distance = $('#distance');
    this.checkpointDistance = $('#checkpoint-distance');
    this.routeDot = $('#route-dot');
    this.speedFx = $('#speed-fx');
    this.objective = $('#objective-card');
    this.score = $('#score-pop');
  }

  update({ speed, flow, distance, progress }) {
    this.speed.textContent = Math.round(speed);
    this.flow.textContent = Math.round(flow);
    this.flowBar.style.width = `${Math.min(100, flow / 5)}%`;
    this.distance.textContent = `${Math.round(distance)} M`;
    this.checkpointDistance.textContent = `${Math.round(distance)} m`;
    this.routeDot.style.top = `${Math.max(0, Math.min(100, progress * 100))}%`;
    this.speedFx.classList.toggle('fast', speed > 82);
    if (progress > .12) this.objective.classList.add('hidden');
  }

  pop(text) {
    this.score.textContent = text;
    this.score.classList.remove('show');
    void this.score.offsetWidth;
    this.score.classList.add('show');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.score.classList.remove('show'), 800);
  }
}
