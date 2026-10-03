
/**
 * Latón y plano: papel cálido, tinta, oro solo donde hay valor (puntos, Bs, nivel).
 * Las mismas fichas de diseño que el portal web.
 */
export const C = {
  papel: '#FBFAF7',
  veladura: '#F3F0EA',
  tinta: '#16140F',
  grafito: '#5F594F',
  linea: '#E4DED3',
  lineaFuerte: '#CBC2B2',
  oro: '#8E6A1E',
  oroBrillo: '#C99A3A',
  alerta: '#A8281F',
  exito: '#3F7A5C',
  sala: '#0C0B09',
  salaTinta: '#EDE6D8',
  salaGrafito: '#9A9182',
  salaLinea: '#2C2821',
  salaOro: '#D4AE5C',
  bronce: '#8C5A2B',
  plata: '#9C9A95',
  platinum: '#4F5862',
} as const;

export const COLOR_NIVEL: Record<string, string> = { Bronce: C.bronce, Plata: C.plata, Oro: C.oroBrillo, Platinum: C.platinum };

export const F = {
  display: 'BodoniModa_500Medium',
  displayItalica: 'BodoniModa_400Regular_Italic',
  senal: 'Montserrat_600SemiBold',
  senalFuerte: 'Montserrat_700Bold',
  texto: 'Inter_400Regular',
  textoMedio: 'Inter_500Medium',
  textoFuerte: 'Inter_600SemiBold',
  dato: 'IBMPlexMono_400Regular',
  datoMedio: 'IBMPlexMono_500Medium',
} as const;

export const Espacio = { xs: 4, s: 8, m: 16, l: 24, xl: 32 } as const;
