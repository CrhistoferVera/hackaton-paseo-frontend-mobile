import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { C, F } from '@/constants/theme';

export interface StatusStyleConfig {
  bg: string;
  border: string;
  text: string;
  dot: string;
  label: string;
}

export const ORDER_STATUS_STYLE: Record<string, StatusStyleConfig> = {
  recibido: {
    bg: C.veladura,
    border: C.lineaFuerte,
    text: C.tinta,
    dot: C.grafito,
    label: 'RECIBIDO',
  },
  confirmado: {
    bg: C.veladura,
    border: C.lineaFuerte,
    text: C.tinta,
    dot: C.grafito,
    label: 'CONFIRMADO',
  },
  preparando: {
    bg: '#FAF4E8',
    border: C.oroBrillo,
    text: C.oro,
    dot: C.oroBrillo,
    label: 'PREPARANDO',
  },
  listo: {
    bg: C.tinta,
    border: C.tinta,
    text: C.papel,
    dot: C.oroBrillo,
    label: 'LISTO PARA RECOGER',
  },
  cliente_llego: {
    bg: C.tinta,
    border: C.tinta,
    text: C.papel,
    dot: C.oroBrillo,
    label: 'LLEGASTE',
  },
  entregado: {
    bg: '#EDF3EF',
    border: C.exito,
    text: C.exito,
    dot: C.exito,
    label: 'ENTREGADO',
  },
  vencido: {
    bg: C.veladura,
    border: C.linea,
    text: C.grafito,
    dot: C.alerta,
    label: 'VENCIDO',
  },
  cancelado: {
    bg: C.veladura,
    border: C.linea,
    text: C.grafito,
    dot: C.grafito,
    label: 'CANCELADO',
  },
};

export function OrderStatusChip({ estado, estilo }: { estado: string; estilo?: ViewStyle }) {
  const normalizado = (estado || '').toLowerCase().trim();
  const config = ORDER_STATUS_STYLE[normalizado] ?? {
    bg: C.veladura,
    border: C.linea,
    text: C.tinta,
    dot: C.grafito,
    label: (estado || 'PENDIENTE').toUpperCase(),
  };

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
        },
        estilo,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Estado: ${config.label}`}
    >
      <View style={[styles.dot, { backgroundColor: config.dot }]} />
      <Text style={[styles.label, { color: config.text }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 99,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  label: {
    fontFamily: F.senalFuerte,
    fontSize: 10.5,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
