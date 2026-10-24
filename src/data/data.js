export const NOMINEES_2026 = [
'Jude Bellingham','Pau Cubarsi','Marc Cucurella','Ousmane Dembele','Luis Fernando Díaz Marulanda','Bruno Fernandes','Gabriel Magalhães','Erling Haaland','Achraf Hakimi','Harry Kane','Khvicha Kvaratskhelia','Lamine Yamal','Sadio Mane','Marquinhos','Lautaro Martinez','Kylian Mbappe','Nuno Alexandre Tavares Mendes','Lionel Messi','Joao Neves','Michael Olise','Willian Pacho','Julian Quinones','Declan Rice','Rodri','Fabian Ruiz','William Saliba','Ferran Torres','Dayot Upamecano','Vinicius Jr','Vitinha'
].map((name,i)=>({id:`p${String(i+1).padStart(2,'0')}`,name}));

export const HISTORICAL = {
  2024: [
    ['Vinicius Jr',120],['Jude Bellingham',93],['Phil Foden',83],['Harry Kane',59],['Florian Wirtz',57],['Kylian Mbappe',51],['Rodri',50],['Toni Kroos',36],['Erling Haaland',27],['Rodrygo',16],['Cole Palmer',16],['Dovbyk',9],['Guirassy',8],['Lautaro Martinez',7],['Mats Hummels',6]
  ],
  2025: [
    ['Ousmane Dembele',407],['Lamine Yamal',393],['Raphinha',391],['Mohammed Salah',354],['Vitinha',313],['Pedri Gonzalez',280],['Kylian Mbappe',274],['Nuno Mendes',270],['Cole Palmer',263],['Harry Kane',260],['Robert Lewandowski',254],['Khvicha Kvaratskhelia',252],['Achraf Hakimi',233],['Desire Doue',213],['Joao Neves',195],['Viktor Gyokeres',190],['Gianluigi Donnaruma',171],['Lautaro Martinez',169],['Scott Mctominay',152],['Fabian Ruiz',142],['Florian Wirtz',129],['Vinicius Jr',127],['Jude Bellingham',113],['Michael Olise',112],['Denzel Dumfries',98],['Erling Haaland',96],['Virgil Van Djik',96],['Alexis Mac Allister',78],['Guirassy',70],['Declan Rice',38]
  ]
};

export const YEAR_RULES = {2024:{rankingSize:10,firstPoints:30,lastPoints:21},2025:{rankingSize:30,firstPoints:30,lastPoints:1},2026:{rankingSize:30,firstPoints:30,lastPoints:1}};
export const POINTS_2026 = Array.from({length:30},(_,i)=>30-i);
export const demoRankings = Object.fromEntries(NOMINEES_2026.map((p,i)=>[p.id,i+1]));
