// 게임 상태 상수
export const GameState = {
  TITLE: 0,
  PLAY: 1,
  PAUSE: 2,
  OVER: 3,
  LEVELUP: 4,
  SPIN: 5,
  SHOP: 6,
  SETTING: 7,
  SKILL_SELECT: 8,
  LOBBY: 9,
};

// 최대값 상수
export const MAX_PARTICLES = 100;
export const MAX_EFFECTS = 50;
export const MAX_BULLETS = 200;
export const MAX_ENEMIES = 50;

// 스토리 텍스트
export const STORY_TEXT = [
  "2157년, 인류는 마침내 새로운 행성 '네오 테라'를 발견했다.",
  "그러나 이 행성에는 이미 고대 문명의 수호자들이 존재했고,",
  "그들은 인류의 침공에 맞서 저항하기 시작했다.",
  "당신은 인류의 마지막 희망, 특수 전투기 'WaveAttack'의 파일럿이다.",
  "수호자들을 물리치고 인류의 새로운 보금자리를 지켜내라!",
  "하지만 조심하라... 강력한 보스들이 당신을 기다리고 있다...",
];

// 보스 대사
export const BOSS_QUOTES = {
  5: {
    name: "크림슨 가디언",
    quote: "인간이여... 너희의 욕망이 이 행성을 파괴할 것이다!",
  },
  10: {
    name: "스톰 로드",
    quote: "이 폭풍의 심판을 받아라!",
  },
  15: {
    name: "섀도우 리퍼",
    quote: "너희의 미래는 어둠 속에 묻힐 것이다...",
  },
  20: {
    name: "네오 테라의 황제",
    quote: "여기까지 오다니... 하지만 이제 끝이다!",
  },
};

// 아이템 타입
export const ItemType = {
  COIN: "coin",
  GEM: "gem",
  HEALTH: "health",
  POWER: "power",
  SPEED: "speed",
  SHIELD: "shield",
};

// 스킬 타입
export const SkillType = {
  REGEN_AURA: "regenAura",
  HOMING_LASER: "homingLaser",
  CHAIN_LIGHTNING: "chainLightning",
  METEOR_SHOWER: "meteorShower",
};

// 상점 아이템
export const ShopItems = {
  HEALTH_UP: {
    id: "healthUp",
    name: "최대 체력 증가",
    description: "최대 체력을 5 증가시킵니다",
    cost: 3,
    effect: (player) => {
      player.maxHp += 5;
      player.hp += 5;
    },
  },
  DAMAGE_UP: {
    id: "damageUp",
    name: "공격력 증가",
    description: "총알 데미지를 2 증가시킵니다",
    cost: 4,
    effect: (player) => {
      player.bulletDamage += 2;
    },
  },
  ATTACK_SPEED: {
    id: "attackSpeed",
    name: "공격 속도 증가",
    description: "공격 속도를 15% 증가시킵니다",
    cost: 5,
    effect: (player) => {
      player.attackSpeed *= 0.85;
    },
  },
  BULLET_SIZE: {
    id: "bulletSize",
    name: "총알 크기 증가",
    description: "총알의 크기를 증가시킵니다",
    cost: 3,
    effect: (player) => {
      player.bulletSize *= 1.2;
    },
  },
};

// 웨이브 시스템
export const WaveSystem = {
  WAVE_DURATION: 60,
  BOSS_WAVE_INTERVAL: 5,
  DIFFICULTY_SCALE: 1.1,
};

// 스킬 업그레이드
export const SkillUpgrades = {
  ATTACK_DAMAGE: {
    id: "attackDamage",
    name: "공격력 강화",
    description: "기본 공격력이 30% 증가합니다",
    effect: (player) => {
      player.bulletDamage *= 1.3;
    },
  },
  ATTACK_SPEED: {
    id: "attackSpeed",
    name: "공격 속도 강화",
    description: "공격 속도가 20% 증가합니다",
    effect: (player) => {
      player.attackSpeed *= 0.8;
    },
  },
  HP_UP: {
    id: "hpUp",
    name: "체력 강화",
    description: "최대 체력이 30% 증가합니다",
    effect: (player) => {
      const increase = Math.floor(player.maxHp * 0.3);
      player.maxHp += increase;
      player.hp += increase;
    },
  },
  BULLET_SIZE: {
    id: "bulletSize",
    name: "총알 크기 강화",
    description: "총알의 크기가 20% 증가합니다",
    effect: (player) => {
      player.bulletSize *= 1.2;
    },
  },
};
