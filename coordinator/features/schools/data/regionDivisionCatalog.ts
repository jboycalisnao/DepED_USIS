export interface RegionDivisionEntry {
  divisionOffice: string;
  localType: 'City' | 'Province';
  provinceOrCity: string;
  region: string;
}

const RAW_CATALOG = `
NCR,Manila,City,City of Manila
NCR,Quezon City,City,Quezon City
NCR,Kalookan City,City,Caloocan City
NCR,Pasay City,City,Pasay City
NCR,Makati City,City,Makati City
NCR,Taguig City and Pateros,City,Taguig City / Pateros
NCR,Parañaque City,City,Parañaque City
NCR,Las Piñas City,City,Las Piñas City
NCR,Muntinlupa City,City,Muntinlupa City
NCR,Marikina City,City,Marikina City
NCR,Pasig City,City,Pasig City
NCR,San Juan City,City,San Juan City
NCR,Mandaluyong City,City,Mandaluyong City
NCR,Malabon City,City,Malabon City
NCR,Navotas City,City,Navotas City
NCR,Valenzuela City,City,Valenzuela City
Region VI,Iloilo,Province,Iloilo
Region VI,Iloilo City,City,Iloilo City
Region VI,Capiz,Province,Capiz
Region VI,Roxas City,City,Roxas City
Region VI,Aklan,Province,Aklan
Region VI,Kalibo,City,Kalibo
Region VI,Antique,Province,Antique
Region VI,Guimaras,Province,Guimaras
Region XI,Davao del Norte,Province,Davao del Norte
Region XI,Tagum City,City,Tagum City
Region XI,Panabo City,City,Panabo City
Region XI,Davao de Oro,Province,Davao de Oro
Region XI,Davao del Sur,Province,Davao del Sur
Region XI,Digos City,City,Digos City
Region XI,Davao Occidental,Province,Davao Occidental
Region XI,Davao Oriental,Province,Davao Oriental
Region XI,Mati City,City,Mati City
Region XI,Davao City,City,Davao City
Region VII,Cebu,Province,Cebu
Region VII,Cebu City,City,Cebu City
Region VII,Mandaue City,City,Mandaue City
Region VII,Lapu-Lapu City,City,Lapu-Lapu City
Region VII,Bohol,Province,Bohol
Region VII,Tagbilaran City,City,Tagbilaran City
Region IV-A,Batangas,Province,Batangas
Region IV-A,Batangas City,City,Batangas City
Region IV-A,Lipa City,City,Lipa City
Region IV-A,Tanauan City,City,Tanauan City
Region IV-A,Cavite,Province,Cavite
Region IV-A,Imus City,City,Imus City
Region IV-A,Bacoor City,City,Bacoor City
Region IV-A,Dasmariñas City,City,Dasmariñas City
Region IV-A,Laguna,Province,Laguna
Region IV-A,Calamba City,City,Calamba City
Region IV-A,San Pablo City,City,San Pablo City
Region IV-A,Rizal,Province,Rizal
Region IV-A,Antipolo City,City,Antipolo City
Region IV-A,Quezon,Province,Quezon
Region IV-A,Lucena City,City,Lucena City
Region III,Bulacan,Province,Bulacan
Region III,Malolos City,City,Malolos City
Region III,Meycauayan City,City,Meycauayan City
Region III,San Jose del Monte City,City,San Jose del Monte City
Region III,Pampanga,Province,Pampanga
Region III,San Fernando City,City,San Fernando City
Region III,Angeles City,City,Angeles City
Region III,Tarlac,Province,Tarlac
Region III,Tarlac City,City,Tarlac City
Region III,Zambales,Province,Zambales
Region III,Olongapo City,City,Olongapo City
Region III,Nueva Ecija,Province,Nueva Ecija
Region III,Cabanatuan City,City,Cabanatuan City
Region III,Gapan City,City,Gapan City
Region III,Palayan City,City,Palayan City
Region III,Aurora,Province,Aurora
Region III,Bataan,Province,Bataan
Region III,Balanga City,City,Balanga City
Region I,Ilocos Norte,Province,Ilocos Norte
Region I,Laoag City,City,Laoag City
Region I,Ilocos Sur,Province,Ilocos Sur
Region I,Vigan City,City,Vigan City
Region I,La Union,Province,La Union
Region I,San Fernando City,City,San Fernando City (La Union)
Region I,Pangasinan,Province,Pangasinan
Region I,Alaminos City,City,Alaminos City
Region I,Dagupan City,City,Dagupan City
Region I,San Carlos City,City,San Carlos City (Pangasinan)
Region I,Urdaneta City,City,Urdaneta City
Region II,Batanes,Province,Batanes
Region II,Cagayan,Province,Cagayan
Region II,Tuguegarao City,City,Tuguegarao City
Region II,Isabela,Province,Isabela
Region II,Cauayan City,City,Cauayan City
Region II,Santiago City,City,Santiago City
Region II,Nueva Vizcaya,Province,Nueva Vizcaya
Region II,Quirino,Province,Quirino
Region IV-B,Occidental Mindoro,Province,Occidental Mindoro
Region IV-B,Oriental Mindoro,Province,Oriental Mindoro
Region IV-B,Puerto Princesa City,City,Puerto Princesa City
Region IV-B,Palawan,Province,Palawan
Region IV-B,Romblon,Province,Romblon
Region IV-B,Marinduque,Province,Marinduque
Region V,Albay,Province,Albay
Region V,Legazpi City,City,Legazpi City
Region V,Tabaco City,City,Tabaco City
Region V,Ligao City,City,Ligao City
Region V,Camarines Sur,Province,Camarines Sur
Region V,Naga City,City,Naga City
Region V,Iriga City,City,Iriga City
Region V,Camarines Norte,Province,Camarines Norte
Region V,Catanduanes,Province,Catanduanes
Region V,Sorsogon,Province,Sorsogon
Region V,Masbate,Province,Masbate
Region V,Masbate City,City,Masbate City
Region VIII,Leyte,Province,Leyte
Region VIII,Tacloban City,City,Tacloban City
Region VIII,Ormoc City,City,Ormoc City
Region VIII,Southern Leyte,Province,Southern Leyte
Region VIII,Biliran,Province,Biliran
Region VIII,Eastern Samar,Province,Eastern Samar
Region VIII,Samar,Province,Samar
Region VIII,Calbayog City,City,Calbayog City
Region VIII,Catbalogan City,City,Catbalogan City
Region VIII,Northern Samar,Province,Northern Samar
Region IX,Zamboanga del Norte,Province,Zamboanga del Norte
Region IX,Dipolog City,City,Dipolog City
Region IX,Dapitan City,City,Dapitan City
Region IX,Zamboanga del Sur,Province,Zamboanga del Sur
Region IX,Pagadian City,City,Pagadian City
Region IX,Zamboanga Sibugay,Province,Zamboanga Sibugay
Region IX,Zamboanga City,City,Zamboanga City
Region IX,Isabela City,City,Isabela City (Basilan)
Region X,Bukidnon,Province,Bukidnon
Region X,Malaybalay City,City,Malaybalay City
Region X,Valencia City,City,Valencia City
Region X,Camiguin,Province,Camiguin
Region X,Lanao del Norte,Province,Lanao del Norte
Region X,Iligan City,City,Iligan City
Region X,Misamis Occidental,Province,Misamis Occidental
Region X,Oroquieta City,City,Oroquieta City
Region X,Ozamiz City,City,Ozamiz City
Region X,Tangub City,City,Tangub City
Region X,Misamis Oriental,Province,Misamis Oriental
Region X,Cagayan de Oro City,City,Cagayan de Oro City
Region X,El Salvador City,City,El Salvador City
Region X,Gingoog City,City,Gingoog City
Region XII,Cotabato (North Cotabato),Province,Cotabato
Region XII,Kidapawan City,City,Kidapawan City
Region XII,South Cotabato,Province,South Cotabato
Region XII,General Santos City,City,General Santos City
Region XII,Polomolok,City,Polomolok
Region XII,Sarangani,Province,Sarangani
Region XII,Sultan Kudarat,Province,Sultan Kudarat
Region XII,Tacurong City,City,Tacurong City
Region XIII,Agusan del Norte,Province,Agusan del Norte
Region XIII,Butuan City,City,Butuan City
Region XIII,Cabadbaran City,City,Cabadbaran City
Region XIII,Agusan del Sur,Province,Agusan del Sur
Region XIII,Surigao del Norte,Province,Surigao del Norte
Region XIII,Surigao City,City,Surigao City
Region XIII,Surigao del Sur,Province,Surigao del Sur
Region XIII,Bislig City,City,Bislig City
Region XIII,Tandag City,City,Tandag City
Region XIII,Dinagat Islands,Province,Dinagat Islands
CAR,Abra,Province,Abra
CAR,Apayao,Province,Apayao
CAR,Benguet,Province,Benguet
CAR,Baguio City,City,Baguio City
CAR,Ifugao,Province,Ifugao
CAR,Kalinga,Province,Kalinga
CAR,Mountain Province,Province,Mountain Province
BARMM,Basilan (except Isabela City),Province,Basilan
BARMM,Lanao del Sur,Province,Lanao del Sur
BARMM,Maguindanao del Norte,Province,Maguindanao del Norte
BARMM,Maguindanao del Sur,Province,Maguindanao del Sur
BARMM,Sulu,Province,Sulu
BARMM,Tawi-Tawi,Province,Tawi-Tawi
BARMM,Cotabato City,City,Cotabato City
BARMM,Lamitan City,City,Lamitan City
BARMM,Marawi City,City,Marawi City
NIR,Negros Occidental,Province,Negros Occidental
NIR,Bacolod City,City,Bacolod City
NIR,Negros Oriental,Province,Negros Oriental
NIR,Dumaguete City,City,Dumaguete City
NIR,Siquijor,Province,Siquijor
`;

export const regionDivisionCatalog: RegionDivisionEntry[] = RAW_CATALOG.trim()
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const [region, divisionOffice, localType, provinceOrCity] = line.split(',').map((value) => value.trim());
    return {
      divisionOffice,
      localType: (localType === 'City' ? 'City' : 'Province') as 'City' | 'Province',
      provinceOrCity,
      region,
    };
  });

export const regionOptions = Array.from(new Set(regionDivisionCatalog.map((entry) => entry.region))).sort();
