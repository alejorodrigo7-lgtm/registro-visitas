import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import axios from 'axios';

const API_URL = 'https://registro-visitas-production.up.railway.app/api';

export default function Alertas({ route, navigation }) {
  const { tecnicoId, token, role } = route.params;
  const [alertas, setAlertas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('todas'); // 'todas', 'no_leidas', 'leidas'

  useEffect(() => {
    cargarAlertas();
  }, []);

  const cargarAlertas = async () => {
    setCargando(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`${API_URL}/alertas?tecnico_id=${tecnicoId}`, config);
      setAlertas(response.data);
      console.log('✅ Alertas cargadas:', response.data.length);
    } catch (error) {
      console.error('❌ Error al cargar alertas:', error);
      Alert.alert('Error', 'No se pudieron cargar las alertas');
    } finally {
      setCargando(false);
    }
  };

  const marcarLeida = async (alertaId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`${API_URL}/alertas/${alertaId}/leer`, {}, config);
      cargarAlertas(); // Recargar alertas
    } catch (error) {
      Alert.alert('Error', 'No se pudo marcar como leída');
    }
  };

  const alertasFiltradas = alertas.filter(a => {
    if (filtro === 'no_leidas') return !a.leido;
    if (filtro === 'leidas') return a.leido;
    return true;
  });

  if (cargando) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔔 Alertas</Text>
        {/* ⚙️ Botón oculto para técnicos y coordinadores */}
        {(role === 'admin' || role === 'jefe') && (
          <TouchableOpacity 
            style={styles.configButton} 
            onPress={() => {
              // Navegar a configuración de alertas (solo Admin/Jefe)
              navigation.navigate('ConfigurarAlertas', { tecnicoId, token, role });
            }}
          >
            <Text style={styles.configButtonText}>⚙️</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filtros}>
        <TouchableOpacity
          style={[styles.filtroBtn, filtro === 'todas' && styles.filtroActivo]}
          onPress={() => setFiltro('todas')}
        >
          <Text style={styles.filtroText}>📋 Todas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filtroBtn, filtro === 'no_leidas' && styles.filtroActivo]}
          onPress={() => setFiltro('no_leidas')}
        >
          <Text style={styles.filtroText}>🟠 No leídas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filtroBtn, filtro === 'leidas' && styles.filtroActivo]}
          onPress={() => setFiltro('leidas')}
        >
          <Text style={styles.filtroText}>✅ Leídas</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={alertasFiltradas}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, item.leido && styles.cardLeido]}
            onPress={() => !item.leido && marcarLeida(item.id)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.alertaTipo}>
                {item.tipo === 'inactividad' ? '⏰ Inactividad' : '📢 General'}
              </Text>
              <Text style={styles.alertaEstado}>
                {item.leido ? '✅ Leída' : '🟠 No leída'}
              </Text>
            </View>
            <Text style={styles.alertaMensaje}>{item.mensaje}</Text>
            <Text style={styles.alertaFecha}>
              {new Date(item.created_at).toLocaleString()}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No hay alertas disponibles</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  configButton: {
    backgroundColor: '#ff6f00',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  configButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18
  },
  filtros: {
    flexDirection: 'row',
    marginBottom: 15,
    flexWrap: 'wrap'
  },
  filtroBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    marginRight: 10,
    marginBottom: 5
  },
  filtroActivo: {
    backgroundColor: '#007bff'
  },
  filtroText: {
    fontWeight: 'bold',
    color: '#333'
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6f00'
  },
  cardLeido: {
    backgroundColor: '#f5f5f5',
    borderLeftColor: '#4caf50'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5
  },
  alertaTipo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333'
  },
  alertaMensaje: {
    fontSize: 14,
    color: '#555',
    marginTop: 5
  },
  alertaFecha: {
    fontSize: 12,
    color: '#999',
    marginTop: 5
  },
  alertaEstado: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  empty: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20
  }
});
