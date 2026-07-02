import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView
} from 'react-native';

export default function MenuPrincipal({ route, navigation }) {
  const { tecnicoId, token, role } = route.params || {};

  // ============================================================
  // 1. DEFINIR PERMISOS POR ROL
  // ============================================================
  const permisos = {
    admin: {
      registrarVisita: true,
      reportes: true,
      alertas: true,
      miUsuario: true,
      servicios: true,
      crearUsuario: true,
      configurarHorario: true,
      configurarAlertas: true
    },
    coordinador: {
      registrarVisita: true,
      reportes: false,
      alertas: true,          // ✅ Puede ver alertas
      miUsuario: true,
      servicios: true,
      crearUsuario: false,
      configurarHorario: false, // ❌ No puede configurar horarios
      configurarAlertas: false  // ❌ No puede configurar alertas
    },
    jefe: {
      registrarVisita: true,
      reportes: true,
      alertas: true,
      miUsuario: true,
      servicios: true,
      crearUsuario: false,
      configurarHorario: true,  // ✅ Puede configurar horarios
      configurarAlertas: true   // ✅ Puede configurar alertas
    },
    tecnico: {
      registrarVisita: true,
      reportes: false,
      alertas: true,          // ✅ Puede ver alertas
      miUsuario: true,
      servicios: true,
      crearUsuario: false,
      configurarHorario: false, // ❌ No puede configurar horarios
      configurarAlertas: false  // ❌ No puede configurar alertas
    }
  };

  const rolPermisos = permisos[role] || permisos.tecnico;

  // ============================================================
  // 2. FUNCIONES DE NAVEGACIÓN
  // ============================================================
  const irARegistro = () => {
    navigation.navigate('RegistroVisita', { tecnicoId, token, role });
  };

  const irAReportes = () => {
    navigation.navigate('Reportes', { tecnicoId, token, role });
  };

  const irAAlertas = () => {
    navigation.navigate('Alertas', { tecnicoId, token, role });
  };

  const irAMiUsuario = () => {
    navigation.navigate('MiUsuario', { tecnicoId, token, role });
  };

  const irAServicios = () => {
    navigation.navigate('Servicios', { tecnicoId, token, role });
  };

  const irACrearUsuario = () => {
    navigation.navigate('CrearUsuario', { tecnicoId, token, role });
  };

  const irAConfigurarHorario = () => {
    if (role === 'admin' || role === 'jefe') {
      navigation.navigate('ConfigurarHorario', { tecnicoId, token, role });
    } else {
      Alert.alert('Acceso denegado', 'Solo administradores y jefes pueden configurar horarios');
    }
  };

  const irAConfigurarAlertas = () => {
    if (role === 'admin' || role === 'jefe') {
      navigation.navigate('ConfigurarAlertas', { tecnicoId, token, role });
    } else {
      Alert.alert('Acceso denegado', 'Solo administradores y jefes pueden configurar alertas');
    }
  };

  // ============================================================
  // 3. RENDERIZADO
  // ============================================================
  const getRolNombre = () => {
    const roles = {
      admin: 'Administrador',
      coordinador: 'Coordinador',
      jefe: 'Jefe de equipo',
      tecnico: 'Técnico / Instalador'
    };
    return roles[role] || 'Usuario';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Visitas App</Text>
        <Text style={styles.subtitle}>Rol: {getRolNombre()}</Text>
      </View>

      <View style={styles.grid}>
        {/* Registrar Visita */}
        {rolPermisos.registrarVisita && (
          <TouchableOpacity style={styles.card} onPress={irARegistro}>
            <Text style={styles.icon}>📝</Text>
            <Text style={styles.cardText}>Registrar Visita</Text>
          </TouchableOpacity>
        )}

        {/* Reportes */}
        {rolPermisos.reportes && (
          <TouchableOpacity style={[styles.card, styles.cardReportes]} onPress={irAReportes}>
            <Text style={styles.icon}>📊</Text>
            <Text style={styles.cardText}>Reportes</Text>
          </TouchableOpacity>
        )}

        {/* Alertas */}
        {rolPermisos.alertas && (
          <TouchableOpacity style={[styles.card, styles.cardAlertas]} onPress={irAAlertas}>
            <Text style={styles.icon}>🔔</Text>
            <Text style={styles.cardText}>Alertas</Text>
          </TouchableOpacity>
        )}

        {/* Mi Usuario */}
        {rolPermisos.miUsuario && (
          <TouchableOpacity style={[styles.card, styles.cardUsuario]} onPress={irAMiUsuario}>
            <Text style={styles.icon}>👤</Text>
            <Text style={styles.cardText}>Mi Usuario</Text>
          </TouchableOpacity>
        )}

        {/* Servicios */}
        {rolPermisos.servicios && (
          <TouchableOpacity style={[styles.card, styles.cardServicios]} onPress={irAServicios}>
            <Text style={styles.icon}>📋</Text>
            <Text style={styles.cardText}>Servicios</Text>
          </TouchableOpacity>
        )}

        {/* Crear Usuario (solo admin) */}
        {rolPermisos.crearUsuario && (
          <TouchableOpacity style={[styles.card, styles.cardAdmin]} onPress={irACrearUsuario}>
            <Text style={styles.icon}>👥</Text>
            <Text style={styles.cardText}>Crear Usuario</Text>
          </TouchableOpacity>
        )}

        {/* Configurar Horario (solo Admin y Jefe) */}
        {rolPermisos.configurarHorario && (
          <TouchableOpacity style={[styles.card, styles.cardConfig]} onPress={irAConfigurarHorario}>
            <Text style={styles.icon}>⏰</Text>
            <Text style={styles.cardText}>Configurar Horario</Text>
          </TouchableOpacity>
        )}

        {/* Configurar Alertas (solo Admin y Jefe) */}
        {rolPermisos.configurarAlertas && (
          <TouchableOpacity style={[styles.card, styles.cardConfig]} onPress={irAConfigurarAlertas}>
            <Text style={styles.icon}>🔔</Text>
            <Text style={styles.cardText}>Configurar Alertas</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333'
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  card: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  icon: {
    fontSize: 40,
    marginBottom: 10
  },
  cardText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center'
  },
  cardReportes: {
    backgroundColor: '#e3f2fd'
  },
  cardAlertas: {
    backgroundColor: '#fff3e0'
  },
  cardUsuario: {
    backgroundColor: '#e8f5e9'
  },
  cardServicios: {
    backgroundColor: '#f3e5f5'
  },
  cardAdmin: {
    backgroundColor: '#ffebee'
  },
  cardConfig: {
    backgroundColor: '#e0f7fa'
  }
});
