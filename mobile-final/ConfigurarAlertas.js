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
  Modal,
  ScrollView,
  Button
} from 'react-native';
import axios from 'axios';
import DateTimePicker from '@react-native-community/datetimepicker';

const API_URL = 'https://registro-visitas-production.up.railway.app/api';

export default function ConfigurarAlertas({ route, navigation }) {
  const { tecnicoId, token, role } = route.params || {};

  // ============================================================
  // VERIFICAR ACCESO - SOLO ADMIN Y JEFE
  // ============================================================
  useEffect(() => {
    if (role !== 'admin' && role !== 'jefe') {
      Alert.alert('Acceso denegado', 'Solo administradores y jefes pueden configurar alertas');
      navigation.goBack();
    }
  }, []);

  // ============================================================
  // ESTADOS
  // ============================================================
  const [configuraciones, setConfiguraciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('todas');
  const [modalVisible, setModalVisible] = useState(false);
  const [configEditando, setConfigEditando] = useState(null);
  const [horaEntrada, setHoraEntrada] = useState(new Date());
  const [horaSalida, setHoraSalida] = useState(new Date());
  const [horaDescansoInicio, setHoraDescansoInicio] = useState(new Date());
  const [horaDescansoFin, setHoraDescansoFin] = useState(new Date());
  const [tiempoEditando, setTiempoEditando] = useState('');
  const [activoEditando, setActivoEditando] = useState(true);
  const [mostrarPicker, setMostrarPicker] = useState(null);

  // ============================================================
  // CARGAR CONFIGURACIONES
  // ============================================================
  useEffect(() => {
    cargarConfiguraciones();
  }, []);

  const cargarConfiguraciones = async () => {
    setCargando(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`${API_URL}/alertas/configuraciones`, config);
      setConfiguraciones(response.data);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar las configuraciones');
    } finally {
      setCargando(false);
    }
  };

  // ============================================================
  // GUARDAR CONFIGURACIÓN
  // ============================================================
  const guardarConfiguracion = async () => {
    if (!configEditando) return;

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(
        `${API_URL}/alertas/configuracion/${configEditando.id}`,
        {
          hora_entrada: horaEntrada.toTimeString().slice(0, 5),
          hora_salida: horaSalida.toTimeString().slice(0, 5),
          hora_descanso_inicio: horaDescansoInicio.toTimeString().slice(0, 5),
          hora_descanso_fin: horaDescansoFin.toTimeString().slice(0, 5),
          tiempo_inactividad: parseInt(tiempoEditando),
          activo: activoEditando
        },
        config
      );

      Alert.alert('✅ Éxito', 'Configuración actualizada correctamente');
      setModalVisible(false);
      cargarConfiguraciones();
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la configuración');
    }
  };

  // ============================================================
  // CAMBIAR ESTADO ACTIVO
  // ============================================================
  const toggleActivo = async (id, estadoActual) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(
        `${API_URL}/alertas/configuracion/${id}`,
        { activo: !estadoActual },
        config
      );
      cargarConfiguraciones();
    } catch (error) {
      Alert.alert('Error', 'No se pudo cambiar el estado');
    }
  };

  // ============================================================
  // ABRIR EDITOR
  // ============================================================
  const abrirEditor = (item) => {
    setConfigEditando(item);
    setHoraEntrada(new Date(`2000-01-01T${item.hora_entrada}:00`));
    setHoraSalida(new Date(`2000-01-01T${item.hora_salida}:00`));
    setHoraDescansoInicio(new Date(`2000-01-01T${item.hora_descanso_inicio}:00`));
    setHoraDescansoFin(new Date(`2000-01-01T${item.hora_descanso_fin}:00`));
    setTiempoEditando(String(item.tiempo_alerta_minutos));
    setActivoEditando(item.activo);
    setModalVisible(true);
  };

  // ============================================================
  // FILTRAR
  // ============================================================
  const configsFiltradas = configuraciones.filter(c => {
    if (filtro === 'tecnicos') return c.tipo_usuario === 'tecnico';
    if (filtro === 'coordinadores') return c.tipo_usuario === 'coordinador';
    return true;
  });

  // ============================================================
  // RENDERIZADO
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

      <FlatList
        data={configsFiltradas}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={[styles.card, !item.activo && styles.cardInactivo]}>
            <View style={styles.cardHeader}>
              <Text style={styles.usuarioNombre}>{item.tecnico_nombre}</Text>
              <Text style={styles.usuarioRol}>
                {item.tipo_usuario === 'tecnico' ? '🔧 Técnico' : '📋 Coordinador'}
              </Text>
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.label}>⏰ Entrada: {item.hora_entrada}</Text>
              <Text style={styles.label}>⏰ Salida: {item.hora_salida}</Text>
              <Text style={styles.label}>☕ Descanso: {item.hora_descanso_inicio} - {item.hora_descanso_fin}</Text>
              <Text style={styles.label}>⏱️ Alerta: {item.tiempo_alerta_minutos} minutos</Text>
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
                onPress={() => abrirEditor(item)}
              >
                <Text style={styles.editButtonText}>✏️ Editar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No hay configuraciones de horarios.
            Configura un horario desde "Configurar Horario".
          </Text>
        }
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <ScrollView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>✏️ Editar Configuración</Text>

            <Text style={styles.modalLabel}>⏰ Hora de entrada</Text>
            <Button
              title={horaEntrada.toTimeString().slice(0, 5)}
              onPress={() => showTimePicker('entrada')}
            />

            <Text style={styles.modalLabel}>⏰ Hora de salida</Text>
            <Button
              title={horaSalida.toTimeString().slice(0, 5)}
              onPress={() => showTimePicker('salida')}
            />

            <Text style={styles.modalLabel}>☕ Inicio de descanso</Text>
            <Button
              title={horaDescansoInicio.toTimeString().slice(0, 5)}
              onPress={() => showTimePicker('descansoInicio')}
            />

            <Text style={styles.modalLabel}>☕ Fin de descanso</Text>
            <Button
              title={horaDescansoFin.toTimeString().slice(0, 5)}
              onPress={() => showTimePicker('descansoFin')}
            />

            <Text style={styles.modalLabel}>⏱️ Tiempo de alerta (minutos)</Text>
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

            {mostrarPicker && (
              <DateTimePicker
                value={new Date()}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={onTimeChange}
              />
            )}

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
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cargandoText: { marginTop: 10, fontSize: 16, color: '#666' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  filtrosContainer: { flexDirection: 'row', marginBottom: 15 },
  filtroBtn: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    marginRight: 10
  },
  filtroActivo: { backgroundColor: '#007bff' },
  filtroText: { fontWeight: 'bold', color: '#333' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 2 },
  cardInactivo: { opacity: 0.5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  usuarioNombre: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  usuarioRol: { fontSize: 14, color: '#666' },
  cardBody: { marginBottom: 10 },
  label: { fontSize: 14, color: '#666', marginBottom: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchContainer: { flexDirection: 'row', alignItems: 'center' },
  switchLabel: { marginRight: 10, fontSize: 14, color: '#666' },
  editButton: { backgroundColor: '#ff6f00', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  editButtonText: { color: '#fff', fontWeight: 'bold' },
  empty: { textAlign: 'center', color: '#999', marginTop: 20 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 15, padding: 25, marginTop: 50 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalLabel: { fontSize: 14, color: '#666', marginTop: 10, marginBottom: 5 },
  modalInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 16, marginBottom: 15 },
  modalSwitchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 15 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  modalButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  cancelButton: { backgroundColor: '#e0e0e0' },
  saveButton: { backgroundColor: '#007bff' },
  modalButtonText: { fontWeight: 'bold', color: '#fff' }
});