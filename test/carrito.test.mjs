import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agregarItem, cambiarItem, claveItem } from '../src/lib/carrito-modelo.ts';
const base={productoId:'p',nombre:'Producto',precioBs:10,cantidad:1,localId:'l',local:'Local',ubicacion:'N1'};
test('comida y retail coexisten; cambiar o vaciar uno conserva el otro',()=>{
 let comida=agregarItem([],base); const retail=agregarItem([],{...base,productoId:'r'});
 comida=cambiarItem(comida,claveItem(base),3);
 assert.equal(comida[0].cantidad,3); assert.equal(retail[0].cantidad,1);
 comida=[]; assert.equal(retail.length,1);
});
test('talla/color y ofertas tienen identidades independientes',()=>{
 const m={...base,varianteIds:['m','azul']}; const l={...base,varianteIds:['l','azul']};
 let xs=agregarItem(agregarItem([],m),l);
 xs=agregarItem(xs,{...m,varianteIds:['azul','m']});
 assert.equal(xs.length,2); assert.equal(xs[0].cantidad,2);
 xs=cambiarItem(xs,claveItem(l),0); assert.equal(xs.length,1); assert.equal(xs[0].cantidad,2);
 xs=agregarItem(xs,{...m,dropId:'drop'}); assert.equal(xs.length,2);
});
test('la cantidad se limita a 20 y el estado original no muta',()=>{
 const original=[base];const nuevo=agregarItem(original,{...base,cantidad:30});
 assert.equal(nuevo[0].cantidad,20);assert.equal(original[0].cantidad,1);
});
