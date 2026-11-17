(() => {
  // Original PoGoQuest order. Each supplied wait belongs to the NEXT stop.
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
    return Math.round(12742000 * Math.asin(Math.sqrt(h)));
  }
  window.ROUTE = {
    id: 'londres-polvos-2026-11-17-v1',
    receivedOn: '2026-11-17',
    name: 'Polvos Estelares',
    source: 'https://pogoquest.com',
    groupLabel: 'SET', kitLabel: 'Set',
    backupPrefix: 'parada-londres-polvos',
    resetNote: ' La ruta de Eternatus conservará su progreso.',
    rewardTotal: rows.reduce((total, row) => total + row[3], 0),
    stops: rows.map(([coords, , missionCode, reward], index) => ({
      id: index + 1, coords, group: Math.floor(index / 3) + 1,
      originalKit: (Math.floor(index / 3) + 1) + '.' + (index % 3 + 1),
      missionCode, mission: missions[missionCode], reward,
      distanceM: index ? meters(rows[index - 1][0], coords) : 0,
      waitSeconds: index ? rows[index - 1][1] : null,
    })),
  };
})();
