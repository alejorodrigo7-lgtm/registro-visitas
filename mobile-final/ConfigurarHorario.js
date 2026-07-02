import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import DateTimePicker from '@react-native-community/datetimepicker';

const API_URL = 'https://registro-visitas-production.up.railway.app/api';

export default function ConfigurarHorario({ route, navigation }) {
  const { tecnicoId, token, role } = route.params || {};

  // ============================================================
  // VERIFICAR ACCESO - SOLO ADMIN Y JEFE
  // ============================================================
  useEffect(() => {
    if (role !== 'admin' && role !== 'jefe') {
      Alert.alert('Acceso denegado', 'Solo administradores y jefes pueden configurar horarios');
      navigation.goBack();
    }
  }, []);

  // ============================================================
  // ESTADOS
  // ============================================================
  const [tecnicos, setTecnicos] = useState([]);
  const [coordinadores, setCoordinadores] = useState([]);
  const [selectedTecnico, setSelectedTecnico] = useState('');
  const [selectedCoordinador, setSelectedCoordinador] = useState('');
  const [tipoUsuario, setTipoUsuario] = useState('tecnico');
  const [horaEntrada, setHoraEntrada] = useState(new Date());
  const [horaSalida, setHoraSalida] = useState(new Date());
  const [horaDescansoInicio, setHoraDescansoInicio] = useState(new Date());
  const [horaDescansoFin, setHoraDescansoFin] = useState(new Date());
  const [tiempoAlerta, setTiempoAlerta] = useState('30');
  const [activo, setActivo] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [mostrarPicker, setMostrarPicker] = useState(null);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);

  // ============================================================
  // CARGAR USUARIOS
  // ============================================================
  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    setCargandoUsuarios(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`${API_URL}/auth/tecnicos`, config);

      const tecnicosFiltrados = response.data.filter(u => u.rol === 'tecnico');
      const coordinadoresFiltrados = response.data.filter(u => u.rol === 'coordinador');

      setTecnicos(tecnicosFiltrados);
      setCoordinadores(coordinadoresFiltrados);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los usuarios');
    } finally {
      setCargandoUsuarios(false);
    }
  };

  // ============================================================
  // GUARDAR HORARIO
  // ============================================================
  const guardarHorario = async () => {
    let usuarioId = null;
    let usuarioRol = '';

    if (tipoUsuario === 'tecnico' && selectedTecnico) {
      usuarioId = parseInt(selectedTecnico);
      usuarioRol = 'tecnico';
    } else if (tipoUsuario === 'coordinador' && selectedCoordinador) {
      usuarioId = parseInt(selectedCoordinador);
      usuarioRol = 'coordinador';
    }

    if (!usuarioId) {
      Alert.alert('Error', `Selecciona un ${tipoUsuario === 'tecnico' ? 'técnico' : 'coordinador'}`);
      return;
    }

    setCargando(true);
    try {
      const payload = {
        tecnico_id: usuarioId,
        tipo_usuario: tipoUsuario,
        hora_entrada: horaEntrada.toTimeString().slice(0, 5),
        hora_salida: horaSalida.toTimeString().slice(0, 5),
        hora_descanso_inicio: horaDescansoInicio.toTimeString().slice(0, 5),
        hora_descanso_fin: horaDescansoFin.toTimeString().slice(0, 5),
        tiempo_alerta_minutos: parseInt(tiempoAlerta),
        activo
      };

      await axios.post(`${API_URL}/horarios/configurar`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert('✅ Éxito', `Horario configurado correctamente para ${usuarioRol}`);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Error al guardar el horario');
    } finally {
      setCargando(false);
    }
  };

  // ============================================================
  // SELECCIONAR HORA
  // ============================================================
  const showTimePicker = (field) => {
    setMostrarPicker(field);
  };

  const onTimeChange = (event, selectedDate) => {
    setMostrarPicker(null);
    if (selectedDate) {
      switch (mostrarPicker) {
        case 'entrada': setHoraEntrada(selectedDate); break;
        case 'salida': setHoraSalida(selectedDate); break;
        case 'descansoInicio': setHoraDescansoInicio(selectedDate); break;
        case 'descansoFin': setHoraDescansoFin(selectedDate); break;
      }
    }
  };

  // ============================================================
  // RENDERIZADO
  // ============================================================
  if (cargandoUsuarios) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.cargandoText}>Cargando usuarios...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>⚙️ Configurar Horario</Text>

      <View style={styles.card}>
        <Text style={styles.label}>🎯 Seleccionar tipo de usuario</Text>
        <View style={styles.tipoContainer}>
          <TouchableOpacity
            style={[styles.tipoBtn, tipoUsuario === 'tecnico' && styles.tipoActivo]}
            onPress={() => {
              setTipoUsuario('tecnico');
              setSelectedTecnico('');
            }}
          >
            <Text style={[styles.tipoText, tipoUsuario === 'tecnico' && styles.tipoTextActivo]}>
              🔧 Técnicos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tipoBtn, tipoUsuario === 'coordinador' && styles.tipoActivo]}
            onPress={() => {
              setTipoUsuario('coordinador');
              setSelectedCoordinador('');
            }}
          >
            <Text style={[styles.tipoText, tipoUsuario === 'coordinador' && styles.tipoTextActivo]}>
              📋 Coordinadores
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {tipoUsuario === 'tecnico' && (
        <View style={styles.card}>
          <Text style={styles.label}>👤 Seleccionar Técnico</Text>
          {tecnicos.length === 0 ? (
            <Text style={styles.sinUsuarios}>No hay técnicos registrados.</Text>
          ) : (
            <Picker
              selectedValue={selectedTecnico}
              onValueChange={(v) => setSelectedTecnico(v)}
            >
              <Picker.Item label="Selecciona un técnico..." value="" />
              {tecnicos.map(u => (
                <Picker.Item key={u.id} label={`${u.nombre} (${u.email})`} value={String(u.id)} />
              ))}
            </Picker>
          )}
        </View>
      )}

      {tipoUsuario === 'coordinador' && (
        <View style={styles.card}>
          <Text style={styles.label}>👤 Seleccionar Coordinador</Text>
          {coordinadores.length === 0 ? (
            <Text style={styles.sinUsuarios}>No hay coordinadores registrados.</Text>
          ) : (
            <Picker
              selectedValue={selectedCoordinador}
              onValueChange={(v) => setSelectedCoordinador(v)}
            >
              <Picker.Item label="Selecciona un coordinador..." value="" />
              {coordinadores.map(u => (
                <Picker.Item key={u.id} label={`${u.nombre} (${u.email})`} value={String(u.id)} />
              ))}
            </Picker>
          )}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.label}>⏰ Hora de entrada</Text>
        <Button
          title={horaEntrada.toTimeString().slice(0, 5)}
          onPress={() => showTimePicker('entrada')}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>⏰ Hora de salida</Text>
        <Button
          title={horaSalida.toTimeString().slice(0, 5)}
          onPress={() => showTimePicker('salida')}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>☕ Inicio de descanso</Text>
        <Button
          title={horaDescansoInicio.toTimeString().slice(0, 5)}
          onPress={() => showTimePicker('descansoInicio')}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>☕ Fin de descanso</Text>
        <Button
          title={horaDescansoFin.toTimeString().slice(0, 5)}
          onPress={() => showTimePicker('descansoFin')}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>⏱️ Tiempo de alerta (minutos)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={tiempoAlerta}
          onChangeText={setTiempoAlerta}
        />
        <Text style={styles.helpText}>
          Si el usuario no registra una visita en este tiempo, se enviará alerta
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <Text style={styles.label}>✅ Activo</Text>
          <Switch value={activo} onValueChange={setActivo} />
        </View>
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

      {cargando ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : (
        <Button title="💾 Guardar Horario" onPress={guardarHorario} />
      )}
    </ScrollView>
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
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    fontSize: 16,
    marginTop: 5
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5
  },
  tipoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 5
  },
  tipoBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center'
  },
  tipoActivo: {
    backgroundColor: '#007bff'
  },
  tipoText: {
    fontWeight: 'bold',
    color: '#333'
  },
  tipoTextActivo: {
    color: '#fff'
  },
  sinUsuarios: {
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 10
  }
});
