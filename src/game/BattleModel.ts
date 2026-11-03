import { BALANCE as B } from "../config/balanceConfig";
import { UNIT_CONFIG } from "../config/unitConfig";
import type { Team, UnitRuntime, UnitType } from "../types/unit";
import type { BattleEvent, Command, Shot } from "../types/match";
import { MatchSystem } from "../systems/MatchSystem";
import { EconomySystem } from "../systems/EconomySystem";
import { SpawnSystem } from "../systems/SpawnSystem";
import { CombatSystem } from "../systems/CombatSystem";
import { EnemyAISystem } from "../systems/EnemyAISystem";
import { OrderSystem } from "../systems/OrderSystem";
import { MOTION } from "../config/motionConfig";
const opponent = (t: Team): Team => (t === "player" ? "enemy" : "player");
export class BattleModel {
  state = MatchSystem.create();
  units: UnitRuntime[] = [];
  shots: Shot[] = [];
  training: Record<
    Team,
    { unit: UnitRuntime; remaining: number; duration: number }[]
  > = { player: [], enemy: [] };
  events: BattleEvent[] = [];
  private nextId = 1;
  private nextShot = 1;
  private aiTimer = 0;
  private seed: number;
  constructor(seed = (Date.now() % 2147483646) + 1) {
    this.seed = seed;
    for (const team of ["player", "enemy"] as Team[])
      this.units.push(SpawnSystem.create("miner", team, this.nextId++));
  }
  private random = () => {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  };
  population(team: Team) {
    return this.units.filter((u) => u.team === team && u.hp > 0).length;
  }
  reservedPopulation(team: Team) {
    return this.population(team) + this.training[team].length;
  }
  recruit(type: UnitType, team: Team = "player") {
    if (this.state.status !== "playing") return "当前无法招募";
    if (this.reservedPopulation(team) >= B.populationCap)
      return "人口已满（含训练中伙伴）";
    if (this.training[team].length >= B.queueLimit)
      return "训练队列已满（最多 5 名），请等待出营";
    const result = SpawnSystem.recruit(
      this.state,
      this.units,
      type,
      team,
      this.nextId,
      this.training[team].length,
    );
    if (typeof result === "string") return result;
    this.nextId++;
    const duration = UNIT_CONFIG[type].trainingTime;
    this.training[team].push({ unit: result, remaining: duration, duration });
    return null;
  }
  order(command: Command) {
    OrderSystem.issue(this.state, command);
  }
  pause() {
    if (this.state.status === "playing") this.state.status = "paused";
  }
  resume() {
    if (this.state.status === "paused") this.state.status = "playing";
  }
  update(dt: number) {
    if (this.state.status !== "playing" || dt <= 0) return;
    let remaining = Math.min(dt, 0.25);
    while (remaining > 0 && this.state.status === "playing") {
      const step = Math.min(remaining, 1 / 30);
      this.step(step);
      remaining -= step;
    }
  }
  private step(dt: number) {
    this.state.elapsed += dt;
    for (const team of ["player", "enemy"] as const) {
      const queue = this.training[team];
      if (!queue.length || this.state[team].baseHp <= 0) continue;
      queue[0].remaining -= dt;
      if (queue[0].remaining <= 0) {
        const { unit } = queue.shift()!;
        this.units.push(unit);
        this.events.push({
          kind: "recruit",
          team,
          x: unit.x,
          y: unit.y,
          type: unit.type,
        });
      }
    }
    this.aiTimer += dt;
    if (this.aiTimer >= B.aiInterval) {
      this.aiTimer -= B.aiInterval;
      const choice = EnemyAISystem.choose(
        [...this.units, ...this.training.enemy.map((entry) => entry.unit)],
        this.state.enemy.gold,
        this.random,
      );
      if (choice) this.recruit(choice, "enemy");
      const pressure = this.units.filter(
        (u) => u.team === "player" && u.hp > 0 && u.x > B.defenseX.enemy - 150,
      ).length;
      this.state.enemy.command = pressure > 3 ? "hold" : "advance";
    }
    for (const u of this.units) {
      u.motionTime += dt;
      u.hitTimer = Math.max(0, u.hitTimer - dt);
      if (u.hp <= 0) {
        u.deathTimer += dt;
        continue;
      }
      u.attackTimer = Math.max(0, u.attackTimer - dt);
      if (u.attackElapsed >= 0) {
        u.attackElapsed += dt;
        if (u.attackElapsed > MOTION[u.type].windup + MOTION[u.type].recovery)
          u.attackElapsed = -1;
      }
      if (u.pendingAttack) {
        u.pendingAttack.remaining -= dt;
        if (u.pendingAttack.remaining <= 0) {
          const targetId = u.pendingAttack.targetId;
          u.pendingAttack = undefined;
          const target =
            typeof targetId === "string"
              ? targetId
              : this.units.find((v) => v.id === targetId && v.hp > 0);
          const targetX =
            typeof target === "string" ? B.baseX[target] : target?.x;
          if (
            target &&
            targetX !== undefined &&
            Math.abs(targetX - u.x) <=
              UNIT_CONFIG[u.type].attackRange +
                (typeof target === "string" ? 35 : 14)
          )
            this.releaseAttack(u, target);
        }
      }
      if (u.state === "spawning") {
        u.timer -= dt;
        if (u.timer <= 0) u.state = "idle";
        else continue;
      }
      if (u.type === "miner") this.miner(u, dt);
      else this.fighter(u, dt);
    }
    this.separate(dt);
    this.projectiles(dt);
    this.units = this.units.filter(
      (u) => u.hp > 0 || u.deathTimer < B.deathDuration,
    );
    if (MatchSystem.check(this.state)) {
      this.events.push({
        kind: "end",
        team: this.state.status === "victory" ? "player" : "enemy",
        x: 640,
        y: 360,
      });
      this.shots = [];
      this.training.player = [];
      this.training.enemy = [];
    }
  }
  private move(u: UnitRuntime, x: number, dt: number) {
    const d = x - u.x,
      step = UNIT_CONFIG[u.type].moveSpeed * dt;
    if (Math.abs(d) > 0.5) u.facing = d > 0 ? 1 : -1;
    u.x = Math.max(
      110,
      Math.min(
        B.worldWidth - 110,
        u.x + Math.sign(d) * Math.min(Math.abs(d), step),
      ),
    );
    if (u.state !== "returning" && u.state !== "retreating")
      u.state = Math.abs(d) > 3 ? "moving" : "idle";
  }
  private miner(u: UnitRuntime, dt: number) {
    const threat = CombatSystem.nearest(
      u,
      this.units,
      u.state === "retreating" ? 245 : 160,
    );
    if (threat) {
      u.state = "retreating";
      u.timer = 0;
      u.carrying = false;
      this.move(u, B.homeX[u.team], dt);
      if (Math.abs(threat.x - u.x) <= 35 && u.attackTimer <= 0)
        this.attack(u, threat);
      return;
    }
    if (u.state === "retreating") u.state = "idle";
    const mineX = B.mineX[u.team] + ((u.id % 4) - 1.5) * 14;
    if (u.carrying) {
      u.state = "returning";
      this.move(u, B.homeX[u.team], dt);
      if (Math.abs(u.x - B.homeX[u.team]) < 3) {
        EconomySystem.deposit(this.state[u.team]);
        u.carrying = false;
        u.state = "idle";
        this.events.push({
          kind: "deposit",
          team: u.team,
          x: u.x,
          y: u.y,
          value: B.mineYield,
        });
      }
    } else if (Math.abs(u.x - mineX) < 3) {
      if (u.state !== "mining") {
        u.state = "mining";
        u.timer = B.mineDuration;
      }
      u.timer -= dt;
      if (
        B.mineDuration - u.timer >= 0.507 &&
        Math.floor((B.mineDuration - u.timer - 0.507) / 0.78) !==
          Math.floor((B.mineDuration - u.timer - dt - 0.507) / 0.78)
      )
        this.events.push({
          kind: "mine",
          team: u.team,
          x: mineX,
          y: u.y,
          type: "miner",
          direction: u.facing,
        });
      if (u.timer <= 0) {
        u.carrying = true;
        u.state = "returning";
      }
    } else this.move(u, mineX, dt);
  }
  private fighter(u: UnitRuntime, dt: number) {
    if (u.pendingAttack) {
      u.state = "attacking";
      return;
    }
    const command = this.state[u.team].command,
      c = UNIT_CONFIG[u.type],
      target = CombatSystem.nearest(u, this.units),
      distance = target ? Math.abs(target.x - u.x) : Infinity;
    if (command === "rally" && distance > c.attackRange + 20) {
      this.move(u, B.rallyX[u.team], dt);
      if (Math.abs(u.x - B.rallyX[u.team]) < 4) u.state = "idle";
      return;
    }
    if (target && distance <= c.attackRange) {
      u.state = "attacking";
      if (u.attackTimer <= 0) this.attack(u, target);
      return;
    }
    if (command === "hold") {
      const line = B.defenseX[u.team];
      this.move(u, line, dt);
      return;
    }
    const enemy = opponent(u.team),
      baseX = B.baseX[enemy];
    if (
      Math.abs(baseX - u.x) <= c.attackRange + 35 &&
      distance > c.attackRange
    ) {
      u.state = "attacking";
      if (u.attackTimer <= 0) this.attack(u, enemy);
      return;
    }
    this.move(u, target ? target.x : baseX, dt);
  }
  private attack(u: UnitRuntime, target: UnitRuntime | Team) {
    if (u.hp <= 0 || u.pendingAttack) return;
    const c = UNIT_CONFIG[u.type];
    u.attackTimer = c.attackInterval;
    u.attackElapsed = 0;
    u.facing =
      (typeof target === "string" ? B.baseX[target] : target.x) >= u.x ? 1 : -1;
    u.pendingAttack = {
      targetId: typeof target === "string" ? target : target.id,
      remaining: MOTION[u.type].windup,
    };
    this.events.push({
      kind: "windup",
      team: u.team,
      type: u.type,
      x: u.x,
      y: u.y,
      direction: u.facing,
    });
  }
  private releaseAttack(u: UnitRuntime, target: UnitRuntime | Team) {
    const c = UNIT_CONFIG[u.type];
    this.events.push({
      kind: "attack",
      team: u.team,
      type: u.type,
      x: u.x,
      y: u.y,
      direction: u.facing,
    });
    if (c.attackKind === "projectile")
      this.shots.push({
        id: this.nextShot++,
        team: u.team,
        type: u.type,
        targetId: typeof target === "string" ? target : target.id,
        x: u.x,
        y: u.y - 105,
        damage: c.damage,
        speed: u.type === "mage" ? 300 : 470,
      });
    else this.impact(u.team, u.type, target, c.damage);
  }
  private impact(
    team: Team,
    type: UnitType,
    target: UnitRuntime | Team,
    damage: number,
  ) {
    if (typeof target === "string") {
      if (target === team || this.state[target].baseHp <= 0) return;
      this.state[target].baseHp = Math.max(
        0,
        this.state[target].baseHp - damage,
      );
      this.events.push({
        kind: "hit",
        team,
        x: B.baseX[target],
        y: 525,
        type,
        value: damage,
      });
      return;
    }
    if (target.hp <= 0 || target.team === team) return;
    const hit = (v: UnitRuntime, amount: number) => {
      const dealt = CombatSystem.damage(v, amount);
      this.events.push({
        kind: "hit",
        team,
        x: v.x,
        y: v.y - 90,
        type,
        value: dealt,
      });
      if (v.hp <= 0) {
        this.state[team].kills++;
        this.events.push({
          kind: "death",
          team: v.team,
          x: v.x,
          y: v.y,
          type: v.type,
        });
      }
    };
    const x = target.x;
    hit(target, damage);
    const radius = type === "mage" ? 55 : type === "giant" ? 45 : 0,
      factor = type === "mage" ? 0.5 : 0.35;
    if (radius)
      for (const other of this.units)
        if (
          other.id !== target.id &&
          other.team !== team &&
          other.hp > 0 &&
          Math.abs(other.x - x) <= radius
        )
          hit(other, damage * factor);
  }
  private projectiles(dt: number) {
    this.shots = this.shots.filter((s) => {
      const target =
        typeof s.targetId === "string"
          ? s.targetId
          : this.units.find((u) => u.id === s.targetId && u.hp > 0);
      if (!target) return false;
      const tx = typeof target === "string" ? B.baseX[target] : target.x,
        ty = typeof target === "string" ? 525 : target.y - 85,
        dx = tx - s.x,
        dy = ty - s.y,
        d = Math.hypot(dx, dy);
      if (d <= s.speed * dt) {
        this.impact(s.team, s.type, target, s.damage);
        return false;
      }
      s.x += (dx / d) * s.speed * dt;
      s.y += (dy / d) * s.speed * dt;
      return true;
    });
  }
  private separate(dt: number) {
    for (let i = 0; i < this.units.length; i++)
      for (let j = i + 1; j < this.units.length; j++) {
        const a = this.units[i],
          b = this.units[j];
        if (
          a.hp <= 0 ||
          b.hp <= 0 ||
          a.team !== b.team ||
          a.type === "miner" ||
          b.type === "miner"
        )
          continue;
        const d = b.x - a.x;
        if (Math.abs(d) < B.separation) {
          const push = Math.min((B.separation - Math.abs(d)) * 0.5, 20 * dt),
            sign = d === 0 ? (a.id < b.id ? 1 : -1) : Math.sign(d);
          a.x = Math.max(110, Math.min(B.worldWidth - 110, a.x - sign * push));
          b.x = Math.max(110, Math.min(B.worldWidth - 110, b.x + sign * push));
        }
      }
  }
}
