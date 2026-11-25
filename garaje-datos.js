(() => {
  const ultimate = 'https://www.rockstargames.com/VI/add-ons/ultimate-edition';
  const vintage = 'https://www.rockstargames.com/VI/add-ons/vintage-vice-city';
  const playbook = 'https://gtaplaybook.com/gta6/vehicles/';
  const screenshot = filename =>
    `https://www.rockstargames.com/VI/_next/static/media/${filename}?akim=1&imdensity=1&imwidth=640`;

  window.VICEHUB_GARAGE_CARS = [
    {
      name: '’95 Grotti Cheetah',
      make: 'Grotti',
      category: 'Deportivo',
      description: 'Deportivo de mediados de los noventa, con faros escamoteables y una decoración retrofuturista en la versión de la Ultimate Edition.',
      acquisition: 'Incluido en la Ultimate Edition. Rockstar lo sitúa en una fase avanzada de la historia.',
      sourceLabel: 'Rockstar Games · Ultimate Edition',
      sourceUrl: ultimate,
      image_url: screenshot('ULTIMATE_EDITION_GROTTI_CHEETAH_01.0a.wy3s_ogjey.jpg'),
      imageCredit: 'Captura oficial de Rockstar Games',
    },
    {
      name: '’67 Vapid Dominator Buggy',
      make: 'Vapid',
      category: 'Todoterreno',
      description: 'Versión elevada del Dominator de primera generación, adaptada para circular fuera del asfalto.',
      acquisition: 'Rockstar lo incluye entre los extras de la Ultimate Edition.',
      sourceLabel: 'Rockstar Games · Ultimate Edition',
      sourceUrl: ultimate,
      image_url: screenshot('ULTIMATE_EDITION_VAPID_BUGGY_01.0jxfiql~371ik.jpg'),
      imageCredit: 'Captura oficial de Rockstar Games',
    },
    {
      name: '’55 Vapid Stanier',
      make: 'Vapid',
      category: 'Berlina clásica',
      description: 'Berlina bicolor de estilo clásico. Rockstar la presenta junto al garaje personal de Shore Court, cerca de Ocean Beach.',
      acquisition: 'Forma parte del Vintage Vice City Pack.',
      mapId: 'garage-014',
      mapLabel: 'Ver garaje de Shore Court',
      sourceLabel: 'Rockstar Games · Vintage Vice City Pack',
      sourceUrl: vintage,
      image_url: screenshot('VINTAGE_VICE_CITY_PACK_VAPID_STANIER_01.004m_8d1~qngy.jpg'),
      imageCredit: 'Captura oficial de Rockstar Games',
    },
    {
      name: 'Vapid Ganado Retro Build',
      make: 'Vapid',
      category: 'Pickup',
      description: 'Preparación de estilo retro de la Vapid Ganado que Rockstar muestra en su galería oficial.',
      acquisition: 'Incluido entre los extras de la Ultimate Edition.',
      sourceLabel: 'Rockstar Games · Ultimate Edition',
      sourceUrl: ultimate,
      image_url: screenshot('ULTIMATE_EDITION_VAPID_GANADO_RETRO_BUILD_01.062dgvkwdynw5.jpg'),
      imageCredit: 'Captura oficial de Rockstar Games',
    },
    {
      name: 'Invetero Coquette D10',
      make: 'Invetero',
      category: 'Deportivo',
      description: 'Deportivo bajo con tomas de aire laterales y un alerón sobre dos soportes. Su nombre se lee en el panel del vehículo en una captura de PS5.',
      mapId: 'standout-vehicle-125',
      mapLabel: 'Ver variante grafiti en el mapa',
      sourceLabel: 'GTA Playbook · captura de PS5',
      sourceUrl: playbook + 'invetero-coquette-d10/',
    },
    {
      name: 'Declasse Granger',
      make: 'Declasse',
      category: 'SUV',
      description: 'SUV de carrocería alta. La unidad fotografiada en PS5 lleva una defensa delantera y luces en el techo.',
      sourceLabel: 'GTA Playbook · captura de PS5',
      sourceUrl: playbook + 'declasse-granger/',
    },
    {
      name: 'Vapid Sandking XT',
      make: 'Vapid',
      category: 'Pickup',
      description: 'Pickup de doble cabina con una parrilla de barras horizontales. El nombre figura en el panel del vehículo en una captura de PS5.',
      mapId: 'vehicle-spawn-066',
      mapLabel: 'Ver punto de la comunidad en el mapa',
      sourceLabel: 'GTA Playbook · captura de PS5',
      sourceUrl: playbook + 'vapid-sandking-xt/',
    },
  ];
})();
