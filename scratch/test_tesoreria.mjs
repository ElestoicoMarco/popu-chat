import { procesarMensaje, detectarIntenciones } from '../public/js/rules.js';

console.log("=== PRUEBA 1: 'cual es el horario de tesoreria' ===");
console.log("Intenciones:", detectarIntenciones("cual es el horario de tesoreria"));
console.log(procesarMensaje("cual es el horario de tesoreria"));

console.log("\n=== PRUEBA 2: 'tesoreria' ===");
console.log(procesarMensaje("tesoreria"));

console.log("\n=== PRUEBA 3: 'precios tesoreria' ===");
console.log(procesarMensaje("precios tesoreria"));

console.log("\n=== PRUEBA 4: 'horarios' ===");
console.log(procesarMensaje("horarios"));
