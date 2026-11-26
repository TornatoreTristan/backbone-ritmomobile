import { ThemedText } from '@/components/themed-text';
import { useColors } from '@/hooks/use-theme-color';
import type { MobotToolCall } from '@/services/mobot';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

const TOOL_LABELS: Record<string, { running: string; done: string }> = {
  search_technical_docs: { running: 'Mobot cherche dans la documentation…', done: 'Documentation consultée' },
  search_folders: { running: 'Mobot cherche les dossiers…', done: 'Dossiers recherchés' },
  get_folder: { running: 'Mobot ouvre le dossier…', done: 'Dossier consulté' },
  search_contacts: { running: 'Mobot cherche les contacts…', done: 'Contacts recherchés' },
  list_recent_leads: { running: 'Mobot regarde les leads récents…', done: 'Leads consultés' },
  list_unpaid_invoices: { running: 'Mobot regarde les impayés…', done: 'Impayés consultés' },
  list_upcoming_interventions: { running: 'Mobot regarde le planning…', done: 'Planning consulté' },
  get_folder_notes: { running: 'Mobot lit les notes du dossier…', done: 'Notes lues' },
  get_folder_history: { running: "Mobot parcourt l'historique…", done: 'Historique consulté' },
  get_folder_emails: { running: 'Mobot lit les emails du dossier…', done: 'Emails lus' },
  list_folder_files: { running: 'Mobot liste les documents…', done: 'Documents listés' },
  read_folder_file: { running: 'Mobot ouvre le document…', done: 'Document lu' },
  get_revenue_stats: { running: 'Mobot calcule les statistiques…', done: 'Statistiques calculées' },
};

const UNKNOWN_TOOL = { running: 'Mobot consulte Backbone…', done: 'Backbone consulté' };

export function toolCallLabel(call: MobotToolCall): string {
  const labels = TOOL_LABELS[call.name] ?? UNKNOWN_TOOL;
  if (call.status === 'running') return labels.running;
  if (call.status !== 'success') return `${labels.done} — indisponible`;
  if (call.resultCount === undefined) return labels.done;
  if (call.resultCount === 0) return `${labels.done} — aucun résultat`;
  return `${labels.done} — ${call.resultCount} résultat${call.resultCount > 1 ? 's' : ''}`;
}

export function ToolCallList({ calls }: { calls: MobotToolCall[] }) {
  const colors = useColors();
  if (calls.length === 0) return null;

  return (
    <View style={styles.list}>
      {calls.map((call) => (
        <View key={call.id} style={styles.row}>
          {call.status === 'running' ? (
            <ActivityIndicator size="small" color={colors.mutedForeground} />
          ) : (
            <View
              style={[
                styles.dot,
                { backgroundColor: call.status === 'success' ? colors.success : colors.warning },
              ]}
            />
          )}
          <ThemedText type="caption">{toolCallLabel(call)}</ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 4, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, marginHorizontal: 5 },
});
