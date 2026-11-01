/* =========================================================================
   BIBLIOTECA DE EJERCICIOS
   =========================================================================
   La lista de la que eliges al armar una rutina. Puedes añadir ejercicios
   desde el armador (botón "+ Nuevo") y sus GIF desde la miniatura.

   id      -> identificador único, en minúsculas y con guiones. No lo repitas.
   nombre  -> como se ve en la rutina del alumno.
   grupo   -> tiene que ser uno de los de GRUPOS (abajo).
   clip    -> archivo dentro de clips/ (GIF, MP4 o WebM). "" si aún no lo tienes.
   poster  -> imagen que se ve antes de que cargue el video (opcional).

   Generado desde el armador el 31/10/2026.
   ========================================================================= */

const GRUPOS = [
  "Pecho",
  "Espalda",
  "Hombro",
  "Bíceps",
  "Tríceps",
  "Cuádriceps",
  "Femoral",
  "Glúteo",
  "Abductor y Aductor",
  "Pantorrillas",
  "Abdomen",
];

const EJERCICIOS = [
  { id: "press-banca-maquina", nombre: "Press banca en máquina", grupo: "Pecho", clip: "press-banca-maquina.mp4", poster: "press-banca-maquina.jpg" },
  { id: "press-en-maquina", nombre: "Press en máquina", grupo: "Pecho", clip: "press-en-maquina.gif", poster: "press-en-maquina.jpg" },
  { id: "press-inclinado-maquina", nombre: "Press inclinado en máquina", grupo: "Pecho", clip: "" },
  { id: "press-banca-mancuernas", nombre: "Press banca con mancuernas", grupo: "Pecho", clip: "" },
  { id: "aperturas-polea", nombre: "Aperturas en polea", grupo: "Pecho", clip: "" },
  { id: "fondos-pecho", nombre: "Fondos para pecho", grupo: "Pecho", clip: "" },
  { id: "jalon-al-pecho", nombre: "Jalón al pecho", grupo: "Espalda", clip: "jalon-al-pecho.gif", poster: "jalon-al-pecho.jpg" },
  { id: "remo-en-maquina", nombre: "Remo en máquina", grupo: "Espalda", clip: "remo-en-maquina.gif", poster: "remo-en-maquina.jpg" },
  { id: "remo-sentado-polea", nombre: "Remo sentado en polea", grupo: "Espalda", clip: "" },
  { id: "remo-barra", nombre: "Remo con barra", grupo: "Espalda", clip: "" },
  { id: "dominadas", nombre: "Dominadas", grupo: "Espalda", clip: "" },
  { id: "pullover-polea", nombre: "Pullover en polea", grupo: "Espalda", clip: "" },
  { id: "press-militar-maquina", nombre: "Press militar en máquina", grupo: "Hombro", clip: "press-militar-maquina.gif", poster: "press-militar-maquina.jpg" },
  { id: "press-militar-smith", nombre: "Press militar en Smith", grupo: "Hombro", clip: "" },
  { id: "laterales-mancuernas", nombre: "Elevaciones laterales", grupo: "Hombro", clip: "laterales-mancuernas.gif", poster: "laterales-mancuernas.jpg" },
  { id: "face-pull", nombre: "Face pull", grupo: "Hombro", clip: "face-pull.gif", poster: "face-pull.jpg" },
  { id: "jalon-katana", nombre: "Jalón katana", grupo: "Hombro", clip: "jalon-katana.gif", poster: "jalon-katana.jpg" },
  { id: "pajaro-posterior", nombre: "Pájaro para deltoide posterior", grupo: "Hombro", clip: "" },
  { id: "curl-biceps-mancuernas", nombre: "Curl de bíceps con mancuernas", grupo: "Bíceps", clip: "curl-biceps-mancuernas.gif", poster: "curl-biceps-mancuernas.jpg" },
  { id: "curl-martillo", nombre: "Curl martillo", grupo: "Bíceps", clip: "curl-martillo.gif", poster: "curl-martillo.jpg" },
  { id: "curl-barra-z", nombre: "Curl con barra Z", grupo: "Bíceps", clip: "" },
  { id: "curl-predicador", nombre: "Curl en banco predicador", grupo: "Bíceps", clip: "" },
  { id: "jalon-polea-triceps", nombre: "Jalón de tríceps en polea", grupo: "Tríceps", clip: "jalon-polea-triceps.gif", poster: "jalon-polea-triceps.jpg" },
  { id: "triceps-copa", nombre: "Tríceps Copa", grupo: "Tríceps", clip: "triceps-copa.gif", poster: "triceps-copa.jpg" },
  { id: "press-frances", nombre: "Press francés", grupo: "Tríceps", clip: "" },
  { id: "fondos-banca", nombre: "Fondos en banca", grupo: "Tríceps", clip: "" },
  { id: "sentadilla-smith", nombre: "Sentadilla en Smith", grupo: "Cuádriceps", clip: "sentadilla-smith.webp", poster: "sentadilla-smith.jpg" },
  { id: "prensa-piernas", nombre: "Prensa de piernas", grupo: "Cuádriceps", clip: "prensa-piernas.gif", poster: "prensa-piernas.jpg" },
  { id: "extension-cuadriceps", nombre: "Extensiones de cuádriceps", grupo: "Cuádriceps", clip: "extension-cuadriceps.gif", poster: "extension-cuadriceps.jpg" },
  { id: "curl-femoral-acostado", nombre: "Curl femoral acostado", grupo: "Femoral", clip: "curl-femoral-acostado.gif", poster: "curl-femoral-acostado.jpg" },
  { id: "curl-femoral-sentado", nombre: "Curl femoral sentado", grupo: "Femoral", clip: "curl-femoral-sentado.gif", poster: "curl-femoral-sentado.jpg" },
  { id: "curl-femoral", nombre: "Curl femoral", grupo: "Femoral", clip: "curl-femoral.gif", poster: "curl-femoral.jpg" },
  { id: "peso-muerto-rumano", nombre: "Peso muerto rumano", grupo: "Glúteo", clip: "peso-muerto-rumano.webp", poster: "peso-muerto-rumano.jpg" },
  { id: "peso-muerto-piernas-rigidas", nombre: "Peso muerto piernas rígidas", grupo: "Glúteo", clip: "" },
  { id: "sentadilla-sumo", nombre: "Sentadilla Sumo", grupo: "Glúteo", clip: "sentadilla-sumo.webp", poster: "sentadilla-sumo.jpg" },
  { id: "sentadilla-bulgara", nombre: "Sentadilla búlgara", grupo: "Glúteo", clip: "" },
  { id: "zancadas-mancuernas", nombre: "Zancadas", grupo: "Glúteo", clip: "zancadas-mancuernas.gif", poster: "zancadas-mancuernas.jpg" },
  { id: "hip-thrust", nombre: "Hip thrust", grupo: "Glúteo", clip: "" },
  { id: "patada-gluteo-polea", nombre: "Patada de glúteo en polea", grupo: "Glúteo", clip: "" },
  { id: "abductores-maquina", nombre: "Abductores en máquina", grupo: "Abductor y Aductor", clip: "abductores-maquina.gif", poster: "abductores-maquina.jpg" },
  { id: "aductor-maquina", nombre: "Aductor en máquina", grupo: "Abductor y Aductor", clip: "aductor-maquina.gif", poster: "aductor-maquina.jpg" },
  { id: "pantorrilla-alta-maquina", nombre: "Pantorrilla alta en máquina", grupo: "Pantorrillas", clip: "pantorrilla-alta-maquina.gif", poster: "pantorrilla-alta-maquina.jpg" },
  { id: "pantorrilla-baja-maquina", nombre: "Pantorrilla baja en máquina", grupo: "Pantorrillas", clip: "" },
  { id: "pantorrilla-alta-en-prensa", nombre: "Pantorrilla Alta en Prensa", grupo: "Pantorrillas", clip: "pantorrilla-alta-en-prensa.gif", poster: "pantorrilla-alta-en-prensa.jpg" },
  { id: "pantorrilla-parado", nombre: "Pantorrilla de pie", grupo: "Pantorrillas", clip: "" },
  { id: "crunch-maquina", nombre: "Crunch en máquina", grupo: "Abdomen", clip: "crunch-maquina.gif", poster: "crunch-maquina.jpg" },
  { id: "crunch-polea", nombre: "Crunch en polea", grupo: "Abdomen", clip: "" },
  { id: "plancha", nombre: "Plancha", grupo: "Abdomen", clip: "plancha.gif", poster: "plancha.jpg" },
  { id: "elevacion-piernas", nombre: "Elevación de piernas colgado", grupo: "Abdomen", clip: "" },
];
