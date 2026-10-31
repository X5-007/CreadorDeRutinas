/* =========================================================================
   BIBLIOTECA DE EJERCICIOS
   =========================================================================
   Esta es la lista de la que eliges al armar una rutina.
   Para agregar un ejercicio, copia un bloque y cambia los valores.

   id      → identificador único, en minúsculas y con guiones. No lo repitas.
   nombre  → como se ve en la rutina del alumno.
   grupo   → tiene que ser uno de los de GRUPOS (abajo).
   clip    → nombre del archivo MP4 dentro de la carpeta clips/.
             Déjalo en "" si todavía no tienes el video: el ejercicio se
             muestra igual, solo que sin animación.
   poster  → imagen que se ve antes de que cargue el video (opcional).

   Especificaciones de los clips: lee clips/LEEME.txt
   ========================================================================= */

const GRUPOS = [
  "Pecho",
  "Espalda",
  "Hombro",
  "Bíceps",
  "Tríceps",
  "Pierna",
  "Glúteo",
  "Core",
];

const EJERCICIOS = [
  // ---- EJEMPLOS CON CLIP (reemplaza los MP4 por tus videos reales) -------
  {
    id: "press-banca-maquina",
    nombre: "Press banca en máquina",
    grupo: "Pecho",
    clip: "press-banca-maquina.mp4",
    poster: "press-banca-maquina.jpg",
  },
  {
    id: "jalon-al-pecho",
    nombre: "Jalón al pecho",
    grupo: "Espalda",
    clip: "jalon-al-pecho.mp4",
    poster: "jalon-al-pecho.jpg",
  },
  {
    id: "sentadilla-smith",
    nombre: "Sentadilla en Smith",
    grupo: "Pierna",
    clip: "sentadilla-smith.mp4",
    poster: "sentadilla-smith.jpg",
  },

  // ---- RESTO DE LA BIBLIOTECA (agrégales clip cuando lo grabes) ----------
  { id: "press-inclinado-maquina", nombre: "Press inclinado en máquina", grupo: "Pecho", clip: "" },
  { id: "press-banca-mancuernas", nombre: "Press banca con mancuernas", grupo: "Pecho", clip: "" },
  { id: "aperturas-polea", nombre: "Aperturas en polea", grupo: "Pecho", clip: "" },
  { id: "fondos-pecho", nombre: "Fondos para pecho", grupo: "Pecho", clip: "" },

  { id: "remo-sentado-polea", nombre: "Remo sentado en polea", grupo: "Espalda", clip: "" },
  { id: "remo-barra", nombre: "Remo con barra", grupo: "Espalda", clip: "" },
  { id: "dominadas", nombre: "Dominadas", grupo: "Espalda", clip: "" },
  { id: "pullover-polea", nombre: "Pullover en polea", grupo: "Espalda", clip: "" },

  { id: "press-militar-smith", nombre: "Press militar en Smith", grupo: "Hombro", clip: "" },
  { id: "laterales-mancuernas", nombre: "Laterales con mancuernas", grupo: "Hombro", clip: "" },
  { id: "pajaro-posterior", nombre: "Pájaro para deltoide posterior", grupo: "Hombro", clip: "" },
  { id: "face-pull", nombre: "Face pull en polea", grupo: "Hombro", clip: "" },

  { id: "curl-barra-z", nombre: "Curl con barra Z", grupo: "Bíceps", clip: "" },
  { id: "curl-martillo", nombre: "Curl martillo", grupo: "Bíceps", clip: "" },
  { id: "curl-predicador", nombre: "Curl en banco predicador", grupo: "Bíceps", clip: "" },

  { id: "press-frances", nombre: "Press francés", grupo: "Tríceps", clip: "" },
  { id: "jalon-polea-triceps", nombre: "Jalón de polea para tríceps", grupo: "Tríceps", clip: "" },
  { id: "fondos-banca", nombre: "Fondos en banca", grupo: "Tríceps", clip: "" },

  { id: "prensa-piernas", nombre: "Prensa de piernas", grupo: "Pierna", clip: "" },
  { id: "extension-cuadriceps", nombre: "Extensión de cuádriceps", grupo: "Pierna", clip: "" },
  { id: "curl-femoral", nombre: "Curl femoral acostado", grupo: "Pierna", clip: "" },
  { id: "zancadas-mancuernas", nombre: "Zancadas con mancuernas", grupo: "Pierna", clip: "" },
  { id: "pantorrilla-parado", nombre: "Pantorrilla de pie", grupo: "Pierna", clip: "" },

  { id: "hip-thrust", nombre: "Hip thrust", grupo: "Glúteo", clip: "" },
  { id: "peso-muerto-rumano", nombre: "Peso muerto rumano", grupo: "Glúteo", clip: "" },
  { id: "patada-gluteo-polea", nombre: "Patada de glúteo en polea", grupo: "Glúteo", clip: "" },

  { id: "plancha", nombre: "Plancha", grupo: "Core", clip: "" },
  { id: "crunch-polea", nombre: "Crunch en polea", grupo: "Core", clip: "" },
  { id: "elevacion-piernas", nombre: "Elevación de piernas colgado", grupo: "Core", clip: "" },
];
