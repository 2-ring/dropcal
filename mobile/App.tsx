import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Logo, Button, Icon, DateHeader, MonthHeader } from './src/components';

export default function App() {
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <Logo size={48} />
        <Text style={styles.title}>DropCal Mobile Components</Text>
        <Text style={styles.subtitle}>Agent 3 - Component Library</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Buttons</Text>
          <Button onPress={() => console.log('Primary pressed')}>
            Primary Button
          </Button>
          <Button
            variant="secondary"
            onPress={() => console.log('Secondary pressed')}
          >
            Secondary Button
          </Button>
          <Button
            variant="primary"
            icon={<Icon name="Calendar" size={20} color="#ffffff" />}
            onPress={() => console.log('With icon pressed')}
          >
            With Icon
          </Button>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date Headers</Text>
          <View style={styles.dateRow}>
            <DateHeader date={new Date()} />
            <DateHeader date={new Date(Date.now() + 86400000)} />
          </View>
          <MonthHeader date={new Date()} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Icons</Text>
          <View style={styles.iconRow}>
            <Icon name="Calendar" size={32} color="#1170C5" />
            <Icon name="MapPin" size={32} color="#1170C5" />
            <Icon name="Clock" size={32} color="#1170C5" />
            <Icon name="User" size={32} color="#1170C5" />
          </View>
        </View>

        <Text style={styles.footer}>
          ✅ All Agent 3 components loaded successfully
        </Text>
      </ScrollView>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 32,
    textAlign: 'center',
  },
  section: {
    width: '100%',
    marginBottom: 32,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  footer: {
    fontSize: 14,
    color: '#059669',
    marginTop: 16,
    textAlign: 'center',
  },
});
