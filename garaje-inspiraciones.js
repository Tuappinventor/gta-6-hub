// Referencias de diseño por ficha. Las variantes se asignan por nombre, no por marca.
(() => {
  const gtaBase = 'https://www.gtabase.com/gta-6/vehicles/';
  const reference = (models, slug) => ({ models, url: gtaBase + slug, source: 'GTABase' });

  window.VICEHUB_GARAGE_INSPIRATIONS = {
    'Albany ’85 Emperor': {
      models: 'Cadillac Sedan de Ville y Cadillac Brougham',
      url: 'https://www.gtabase.com/es/gta-6/vehiculos/emperor',
      source: 'GTABase',
    },
    'Bravado Banshee': reference('Dodge Viper', 'banshee'),
    'Bravado DriveShaft Banshee': reference('Dodge Viper', 'driveshaft-banshee'),
    'Bravado DriveShaft Gauntlet': reference('Dodge Challenger de primera generación', 'driveshaft-gauntlet'),
    'Bravado Revenant Gauntlet': reference('Dodge Challenger de primera generación', 'revenant-gauntlet'),
    'Declasse Granger': reference('Chevrolet Suburban', 'granger'),
    "Emperor Moses' Sultan": reference('Lexus IS, Mitsubishi Lancer Evolution VI y Subaru Impreza', 'moses-sultan'),
    '’95 Grotti Cheetah': {
      models: 'Ferrari Testarossa',
      url: 'https://gta6.house/library/vehicles/95-grotti-cheetah',
      source: 'GTA6 House',
    },
    'Grotti Dolce Vita RSX': {
      models: 'Ferrari SF90 Stradale',
      url: 'https://www.gtabase.com/es/gta-6/vehiculos/dolce-vita-rsx',
      source: 'GTABase',
    },
    'Grotti RSX': {
      models: 'Ferrari SF90 Stradale',
      url: 'https://www.gtabase.com/vehicles/gta-6/itali-rsx',
      source: 'GTABase',
    },
    'Grotti Status RSX': {
      models: 'Ferrari SF90 Stradale',
      url: 'https://www.gtabase.com/es/gta-6/vehiculos/estado-rsx',
      source: 'GTABase',
    },
    'Invetero Coquette D10': reference('Chevrolet Corvette C8', 'coquette-d10'),
    'Maibatsu Penumbra FF (Paul Walker tribute)': {
      models: 'Mitsubishi Eclipse de segunda generación',
      url: 'https://gta6.house/library/vehicles/maibatsu-97-penumbra',
      source: 'GTA6 House',
    },
    'Ocelot Jugular': {
      models: 'Jaguar XE SV Project 8',
      url: 'https://www.gtabase.com/es/gta-6/vehiculos/jugular',
      source: 'GTABase',
    },
    'Pegassi Tempesta': {
      models: 'Lamborghini Huracán, Lamborghini Centenario y propuesta del Lotus Esprit de 2015',
      url: 'https://www.gtabase.com/vehicles/gta-6/tempesta',
      source: 'GTABase',
    },
    "Pfister '88 Comet": reference('Porsche 911 (930)', 'comet-retro-custom'),
    'Pfister Buttermilk Comet Retro': reference('Porsche 911 (930) con preparación Rauh-Welt', 'buttermilk-comet-retro'),
    'Pfister Class Act Comet': reference('Porsche 911 (930) con preparación Rauh-Welt', 'class-act-comet'),
    'Pfister Gentrifier Comet': {
      models: 'Porsche 911 Turbo S Cabriolet',
      url: 'https://www.gtabase.com/es/gta-6/vehiculos/cometa-gentrificador',
      source: 'GTABase',
    },
    'Pfister Neon': {
      models: 'Porsche Taycan, 918 Spyder, Panamera y 911',
      url: 'https://www.gtabase.com/gta-6/vehicles/comparison/?vehicle1=bravado-banshee&vehicle2=pfister-neon',
      source: 'GTABase',
    },
    '’67 Vapid Dominator Buggy': {
      models: 'Ford Mustang de primera generación con suspensión elevada',
      url: 'https://www.gtabase.com/es/vehiculos/gta-6/dominator-buggy-67',
      source: 'GTABase',
    },
    "Vapid '65 Dominator": {
      models: 'Ford Mustang de primera generación',
      url: 'https://www.gtabase.com/vehicles/gta-6/dominator-67',
      source: 'GTABase',
    },
    'Vapid Anarchist Dominator': reference('Ford Mustang de primera generación', 'anarchist-dominator'),
    'Vapid Darkling Dominator': reference('Ford Mustang SVT Cobra R (New Edge)', 'darkling-dominator'),
    'Vapid Kinetic Dominator': {
      models: 'Ford Mustang de los años 2000',
      url: 'https://gtadb.io/gta-6/vehicles/kinetic-dominator',
      source: 'GTADB',
    },
    'Vapid Murica Dominator': reference('Ford Mustang SVT Cobra R (New Edge)', 'murica-dominator'),
    'Vapid Sandking XT': {
      models: 'Ford Super Duty de cuarta generación',
      url: 'https://www.gtabase.com/es/vehiculos/gta-6/sandking-xt',
      source: 'GTABase',
    },
  };
})();
