const names=['pirelli','dhl','tag','aramco','monaco','event','pit','cafe','casino','hotel','sector1','sector2','sector3','exit','marshals','parking'];
export const SIGN_RECTS=Object.fromEntries(names.map((name,i)=>[name,[(i%2)*512,Math.floor(i/2)*128,512,128]]));
