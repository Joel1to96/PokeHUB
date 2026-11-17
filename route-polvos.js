(() => {
  // Stable IDs follow the original PoGoQuest listing; never renumber saved visits.
  const rows = [
    ['51.514475,-0.075578', 60, 'R3LGS', 1000],
    ['51.524366,-0.080154', 60, 'R3LGBC', 1000],
    ['51.530782,-0.104962', 120, 'R3LGBCS', 1500],
    ['51.541296,-0.077336', 120, 'R3LGBC', 1000],
    ['51.564339,-0.092799', 60, 'R3LGBCS', 1500],
    ['51.555576,-0.111769', 120, 'R3LGS', 1000],
    ['51.516436,-0.139983', 120, 'R3LGBC', 1000],
    ['51.496267,-0.144978', 120, 'R3LGBC', 1000],
    ['51.502109,-0.110916', 120, 'R3LGBCS', 1500],
    ['51.488461,-0.078887', 120, 'R3LGBC', 1000],
    ['51.463372,-0.116245', 30, 'R3LGS', 1000],
    ['51.457626,-0.126159', 240, 'R3LGBCS', 1500],
    ['51.458772,-0.212708', 240, 'R3LGBCS', 1500],
    ['51.506143,-0.177176', 120, 'R3LGBCS', 1500],
    ['51.529685,-0.226735', 60, 'R3LGS', 1000],
    ['51.544689,-0.234559', 600, 'R3LGS', 1000],
    ['51.506556,-0.010011', 120, 'R3LGBC', 1000],
    ['51.481093,-0.014072', 240, 'R3LGBC', 1000],
    ['51.528423,0.019864', 60, 'R3LGBC', 1000],
    ['51.545571,0.019928', null, 'R3LGBC', 1000],
  ];
  const missions = {
    R3LGS: 'Realiza 3 lanzamientos Geniales seguidos',
    R3LGBC: 'Realiza 3 lanzamientos Geniales de bola curva',
    R3LGBCS: 'Realiza 3 lanzamientos Geniales de bola curva seguidos',
  };
  function meters(from, to) {
    const [a, b] = from.split(',').map(Number).map(n => n * Math.PI / 180);
    const [c, d] = to.split(',').map(Number).map(n => n * Math.PI / 180);
    const h = Math.sin((c - a) / 2) ** 2 + Math.cos(a) * Math.cos(c) * Math.sin((d - b) / 2) ** 2;
    return 12742000 * Math.asin(Math.sqrt(h));
  }
  // PGSharp's published distance chart, using the next upper distance band.
  // '< 1 min' and '< 2 min' are rounded up. These are estimates, not a timer.
  function cooldown(m) {
    return [[1000,60],[2000,60],[3000,120],[5000,120],[7000,300],
      [9000,420],[10000,420],[12000,480],[18000,600],[26000,900]]
      .find(([limit]) => m <= limit)?.[1] ?? 7200;
  }
  const origin = { coords: '51.508759,-0.124775', label: 'Eternatus · parada 42' };
  // Nearest stop first, then minimum summed chart waits; distance breaks ties.
  // Open path: no return to the starting point. Computed for these 20 stops.
  const order = [9,1,2,4,5,6,3,7,8,14,15,16,13,12,11,10,18,17,19,20];
  const stops = order.map((id, index) => {
    const [coords, , missionCode, reward] = rows[id - 1];
    const distanceM = meters(index ? rows[order[index - 1] - 1][0] : origin.coords, coords);
    return { id, sequence: index + 1, coords, group: Math.floor(index / 3) + 1,
      originalKit: (Math.floor((id - 1) / 3) + 1) + '.' + ((id - 1) % 3 + 1),
      missionCode, mission: missions[missionCode], reward,
      distanceM: Math.round(distanceM), waitSeconds: cooldown(distanceM) };
  });
  window.ROUTE = {
    id: 'londres-polvos-2026-11-17-v1',
    receivedOn: '2026-11-17',
    name: 'Polvos Estelares',
    source: 'https://pogoquest.com',
    groupLabel: 'GRUPO', kitLabel: 'Set',
    origin,
    cooldownSource: 'https://www.pgsharp.com/cooldown-rules/',
    totalWaitSeconds: stops.reduce((sum, stop) => sum + stop.waitSeconds, 0),
    estimatedMinutes: [60, 90],
    backupPrefix: 'parada-londres-polvos',
    resetNote: ' La ruta de Eternatus conservará su progreso.',
    rewardTotal: rows.reduce((total, row) => total + row[3], 0),
    stops,
  };
})();
