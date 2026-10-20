// Relative game calibration, not measured or manufacturer-supplied telemetry.
export const CARS = [
  {id:'redbull',name:'Red Bull Racing',code:'RBR',model:'RB22',color:'#3274ee',accent:'#f8ca35',tier:'A',power:1.045,drag:.93,grip:1.005,brakes:1.01,traction:.99,top:354,corner:91,braking:93,trait:'Straight-line efficiency',engine:'Red Bull Ford'},
  {id:'ferrari',name:'Scuderia Ferrari',code:'FER',model:'SF-26',color:'#e5323e',accent:'#ffe74b',tier:'A',power:1.015,drag:1.035,grip:1.065,brakes:1.055,traction:1.025,top:342,corner:98,braking:98,trait:'Mechanical grip & braking',engine:'Ferrari'},
  {id:'mclaren',name:'McLaren',code:'MCL',model:'MCL40',color:'#ff8c28',accent:'#81d8ef',tier:'A',power:1.02,drag:1.025,grip:1.045,brakes:1.025,traction:1.04,top:344,corner:96,braking:95,trait:'Balanced aero & traction',engine:'Mercedes'},
  {id:'mercedes',name:'Mercedes-AMG',code:'MER',model:'W17',color:'#32d6ba',accent:'#d9e1e3',tier:'A',power:1.055,drag:1.01,grip:1.015,brakes:1.03,traction:1.01,top:350,corner:93,braking:96,trait:'Hybrid deployment',engine:'Mercedes'},
  {id:'williams',name:'Williams',code:'WIL',model:'FW48',color:'#2469ff',accent:'#f4f5f7',tier:'B',power:1.015,drag:.97,grip:.97,brakes:.98,traction:.98,top:348,corner:87,braking:89,trait:'Low-drag chassis',engine:'Mercedes'},
  {id:'aston',name:'Aston Martin',code:'AST',model:'AMR26',color:'#238c72',accent:'#c6ef4d',tier:'B',power:.98,drag:1.025,grip:1.025,brakes:1.005,traction:1.02,top:335,corner:94,braking:91,trait:'Low-speed stability',engine:'Honda'},
  {id:'haas',name:'Haas F1 Team',code:'HAS',model:'VF-26',color:'#d8dce5',accent:'#ef3144',tier:'B',power:.99,drag:1.015,grip:.99,brakes:1.015,traction:.985,top:339,corner:90,braking:93,trait:'Predictable braking',engine:'Ferrari'},
  {id:'racingbulls',name:'Racing Bulls',code:'VCB',model:'VCARB 03',color:'#8199ff',accent:'#ffffff',tier:'B',power:1.005,drag:.985,grip:.985,brakes:.99,traction:1.005,top:344,corner:89,braking:90,trait:'Agile change of direction',engine:'Red Bull Ford'},
  {id:'alpine',name:'Alpine',code:'ALP',model:'A526',color:'#ec83c8',accent:'#319dff',tier:'B',power:1.01,drag:1.015,grip:.975,brakes:.985,traction:.98,top:340,corner:88,braking:89,trait:'Efficient power delivery',engine:'Mercedes'},
  {id:'audi',name:'Audi',code:'AUD',model:'R26',color:'#e65548',accent:'#bfc5cc',tier:'C',power:.965,drag:1.035,grip:.975,brakes:.985,traction:.97,top:331,corner:88,braking:89,trait:'Progressive chassis balance',engine:'Audi'},
  {id:'cadillac',name:'Cadillac',code:'CAD',model:'MAC-26',color:'#c7cbd4',accent:'#b3a079',tier:'C',power:.97,drag:1.045,grip:.95,brakes:.965,traction:.96,top:328,corner:85,braking:87,trait:'Stable, deliberate handling',engine:'Ferrari'},
];
export const TYRES = {
  soft:{name:'Soft',code:'S',color:'#ff4056',grip:1.04,optimum:96,warm:1.25,wear:1.7,window:19},
  medium:{name:'Medium',code:'M',color:'#ffd549',grip:1,optimum:92,warm:1,wear:1,window:23},
  hard:{name:'Hard',code:'H',color:'#e6e8ed',grip:.96,optimum:88,warm:.75,wear:.55,window:27},
};
export const getCar = id => CARS.find(c=>c.id===id);
