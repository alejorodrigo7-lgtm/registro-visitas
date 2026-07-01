import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
  TextInput,
  Modal
} from 'react-native';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';

const API_URL = 'https://registro-visitas-production.up.railway.app/api';

export default function ConfigurarAlertas({ route, navigation }) {
  const { tecnicoId, token, role } = route.params || {};
  const [alertas, setAlertas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('todas'); // 'todas', 'tecnicos', 'coordinadores'
  const [modalVisible, setModalVisible] = useState(false);
  const [alertaEditando, setAlertaEditando] = useState(null);
  const [tiempoEditando, setTiempoEditando] = useState('');
  const [activoEditando, setActivoEditando] = useState(true);

  // ============================================================
  // 1. CARGAR ALERTAS
  // ============================================================
  useEffect(() => {
    cargarAlertas();
  }, []);

  const cargarAlertas = async () => {
    setCargando(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`${API_URL}/alertas/configuraciones`, config);
      setAlertas(response.data);
    } catch (error) {
      console.error('❌ Error al cargar alertas:', error);
      Alert.alert('Error', 'No se pudieron cargar las configuraciones de alertas');
    } finally {
      setCargando(false);
    }
  };

  // ============================================================
  // 2. GUARDAR CONFIGURACIÓN DE ALERTA
  // ============================================================
  const guardarConfiguracion = async () => {
    if (!alertaEditando) return;

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(
        `${API_URL}/alertas/configuracion/${alertaEditando.id}`,
        {
          tiempo_inactividad: parseInt(tiempoEditando),
          activo: activoEditando
        },
        config
      );

      Alert.alert('✅ Éxito', 'Configuración actualizada correctamente');
      setModalVisible(false);
      cargarAlertas();
    } catch (error) {
      console.error('❌ Error al guardar configuración:', error);
      Alert.alert('Error', 'No se pudo guardar la configuración');
    }
  };

  // ============================================================
  // 3. ELIMINAR CONFIGURACIÓN (desactivar)
  // ============================================================
  const toggleActivo = async (id, estadoActual) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(
        `${API_URL}/alertas/configuracion/${id}`,
        { activo: !estadoActual },
        config
      );
      cargarAlertas();
    } catch (error) {
      console.error('❌ Error al cambiar estado:', error);
      Alert.alert('Error', 'No se pudo cambiar el estado');
    }
  };

  // ============================================================
  // 4. FILTRAR ALERTAS
  // ============================================================
  const alertasFiltradas = alertas.filter(a => {
    if (filtro === 'tecnicos') return a.tipo_usuario === 'tecnico';
    if (filtro === 'coordinadores') return a.tipo_usuario === 'coordinador';
    return true;
  });

  // ============================================================
  // 5. RENDERIZADO
  // ============================================================
  if (cargando) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.cargandoText}>Cargando configuraciones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔔 Configurar Alertas</Text>

      {/* FILTROS */}
      <View style={styles.filtrosContainer}>
        <TouchableOpacity
          style={[styles.filtroBtn, filtro === 'todas' && styles.filtroActivo]}
          onPress={() => setFiltro('todas')}
        >
          <Text style={styles.filtroText}>📋 Todas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filtroBtn, filtro === 'tecnicos' && styles.filtroActivo]}
          onPress={() => setFiltro('tecnicos')}
        >
          <Text style={styles.filtroText}>🔧 Técnicos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filtroBtn, filtro === 'coordinadores' && styles.filtroActivo]}
          onPress={() => setFiltro('coordinadores')}
        >
          <Text style={styles.filtroText}>📋 Coordinadores</Text>
        </TouchableOpacity>
      </View>

      {/* LISTA DE ALERTAS */}
      <FlatList
        data={alertasFiltradas}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={[styles.card, !item.activo && styles.cardInactivo]}>
            <View style={styles.cardHeader}>
              <Text style={styles.usuarioNombre}>
                {item.tecnico_nombre || 'Usuario'}
              </Text>
              <Text style={styles.usuarioRol}>
                {item.tipo_usuario === 'tecnico' ? '🔧 Técnico' : '📋 Coordinador'}
              </Text>
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.label}>⏱️ Tiempo de inactividad:</Text>
              <Text style={styles.valor}>{item.tiempo_inactividad} minutos</Text>
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Activo</Text>
                <Switch
                  value={item.activo}
                  onValueChange={() => toggleActivo(item.id, item.activo)}
                />
              </View>

              <TouchableOpacity
                style={styles.editButton}
                onPress={() => {
                  setAlertaEditando(item);
                  setTiempoEditando(String(item.tiempo_inactividad));
                  setActivoEditando(item.activo);
                  setModalVisible(true);
                }}
              >
                <Text style={styles.editButtonText}>✏️ Editar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No hay configuraciones de alertas.
            {filtro !== 'todas' && ' Prueba con otro filtro.'}
          </Text>
        }
      />

      {/* MODAL DE EDICIÓN */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>✏️ Editar Configuración</Text>
            
            <Text style={styles.modalLabel}>⏱️ Tiempo de inactividad (minutos)</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={tiempoEditando}
              onChangeText={setTiempoEditando}
            />

            <View style={styles.modalSwitchContainer}>
              <Text style={styles.modalLabel}>Activo</Text>
              <Switch
                value={activoEditando}
                onValueChange={setActivoEditando}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={guardarConfiguracion}
              >
                <Text style={styles.modalButtonText}>💾 Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================================
// ESTILOS
// ============================================================
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
  cargandoText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20
  },
  filtrosContainer: {
    flexDirection: 'row',
    marginBottom: 15
  },
  filtroBtn: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    marginRight: 10
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
    elevation: 2
  },
  cardInactivo: {
    opacity: 0.5
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  usuarioNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  usuarioRol: {
    fontSize: 14,
    color: '#666'
  },
  cardBody: {
    flexDirection: 'row',
    marginBottom: 10
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginRight: 5
  },
  valor: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333'
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  switchLabel: {
    marginRight: 10,
    fontSize: 14,
    color: '#666'
  },
  editButton: {
    backgroundColor: '#ff6f00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  editButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  empty: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20
  },
  // Modal
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    width: '85%'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 15
  },
  modalSwitchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5
  },
  cancelButton: {
    backgroundColor: '#e0e0e0'
  },
  saveButton: {
    backgroundColor: '#007bff'
  },
  modalButtonText: {
    fontWeight: 'bold',
    color: '#fff'
  }
});
