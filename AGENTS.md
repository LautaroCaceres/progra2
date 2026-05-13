# Instrucciones generales para agentes

Este repositorio contiene un proyecto web estático simple con p5.js.

## Archivos principales

- `index.html` — carga p5.js desde CDN y ejecuta `sketch.js`.
- `sketch.js` — contiene la lógica de dibujo e interacción de p5.js.

## Reglas para trabajar con el agente

- Mantén los cambios dentro de `index.html` y `sketch.js` salvo que el usuario pida otra cosa.
- No agregues frameworks externos o configuraciones de build innecesarias.
- El proyecto debe seguir funcionando en un navegador sin herramientas adicionales.
- Evita modificar archivos fuera de la carpeta raíz del proyecto sin autorización explícita.

## Comportamiento esperado

- El agente debe resolver solicitudes relacionadas con el arte generativo y los controles del mouse.
- El agente debe priorizar soluciones que funcionen con el entorno p5.js y el canvas del navegador.
- Si se requiere nueva funcionalidad, debe ser compatible con el hosting estático.

## Nota para entrega

- Este archivo `AGENTS.md` es el documento de instrucciones generales que debe subirse al repositorio.
