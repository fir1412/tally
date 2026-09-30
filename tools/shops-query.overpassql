[out:csv(brand,name,"name:en",shop,amenity,healthcare,leisure,tourism;false;"\t")][timeout:900];
area["ISO3166-1"="MY"][admin_level=2]->.a;
(
  nwr["shop"](area.a);
  nwr["amenity"~"^(restaurant|fast_food|cafe|food_court|bar|pub|ice_cream|fuel|pharmacy|clinic|doctors|dentist|hospital|cinema|car_wash|marketplace|vending_machine|kindergarten|school|college|university|childcare|veterinary|parking|charging_station|bank)$"](area.a);
  nwr["leisure"~"^(fitness_centre|sports_centre|bowling_alley|amusement_arcade|water_park)$"](area.a);
  nwr["tourism"~"^(hotel|motel|guest_house|hostel|theme_park|zoo|aquarium|museum)$"](area.a);
);
out tags;
