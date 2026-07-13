import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, parseISO } from 'date-fns';
import { RootStackParamList, JournalEntry } from '../types';
import {
  getJournalEntries,
  updateJournalEntry,
  deleteJournalEntry,
} from '../services/storage';
import { colors, typography, spacing, borderRadius } from '../utils/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const entryHeading = (entry: JournalEntry): string => {
  const date = format(parseISO(entry.timestamp), 'MMMM d, yyyy · h:mm a');
  return entry.sessionTitle ? `${date} — ${entry.sessionTitle}` : date;
};

const noteToText = (entry: JournalEntry): string =>
  `${entryHeading(entry)}\n\n${entry.text}`;

// A simple, chronological plain-text log of every entry.
const buildJournalLog = (entries: JournalEntry[]): string => {
  const ordered = [...entries].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const body = ordered
    .map((e) => `${entryHeading(e)}\n${e.text}`)
    .join('\n\n----------\n\n');
  return `Mandala Day — Journal\n\n${body}\n`;
};

// Minimal UTF-8 → base64. Hermes has no btoa, and notes may contain non-ASCII,
// so encode by hand for sharing the exported file on native.
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const toBase64Utf8 = (input: string): string => {
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    if (c < 0x80) {
      bytes.push(c);
    } else if (c < 0x800) {
      bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c >= 0xd800 && c <= 0xdbff) {
      const c2 = input.charCodeAt(++i);
      const cp = 0x10000 + ((c & 0x3ff) << 10) + (c2 & 0x3ff);
      bytes.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f)
      );
    } else {
      bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : undefined;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : undefined;
    out += B64_CHARS[b0 >> 2];
    out += B64_CHARS[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? '=' : B64_CHARS[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? '=' : B64_CHARS[b2 & 63];
  }
  return out;
};

export const JournalScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const loadEntries = useCallback(async () => {
    const loaded = await getJournalEntries();
    setEntries(loaded);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries])
  );

  const startEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setEditText(entry.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const text = editText.trim();
    if (!text) {
      cancelEdit();
      return;
    }
    await updateJournalEntry(editingId, text);
    cancelEdit();
    loadEntries();
  };

  const handleShareNote = async (entry: JournalEntry) => {
    const text = noteToText(entry);
    try {
      if (Platform.OS === 'web') {
        const nav = typeof navigator !== 'undefined' ? (navigator as any) : undefined;
        if (nav?.share) {
          await nav.share({ text });
        } else if (nav?.clipboard) {
          await nav.clipboard.writeText(text);
          window.alert('Note copied to clipboard');
        }
      } else {
        await Share.share({ message: text });
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError' && error?.message !== 'User did not share') {
        console.error('Error sharing note:', error);
      }
    }
  };

  const handleExport = async () => {
    if (entries.length === 0) return;
    const text = buildJournalLog(entries);
    const filename = `mandala-day-journal-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    try {
      if (Platform.OS === 'web') {
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const RNShare = await import('react-native-share');
        await RNShare.default.open({
          url: `data:text/plain;base64,${toBase64Utf8(text)}`,
          filename,
          type: 'text/plain',
          failOnCancel: false,
        });
      }
    } catch (error: any) {
      if (error?.message !== 'User did not share') {
        console.error('Error exporting journal:', error);
      }
    }
  };

  const confirmDelete = (entry: JournalEntry) => {
    const doDelete = async () => {
      await deleteJournalEntry(entry.id);
      if (editingId === entry.id) cancelEdit();
      loadEntries();
    };

    // Alert.alert with buttons is a no-op on react-native-web, so use the
    // native confirm dialog there and Alert on iOS/Android.
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Delete this note? This cannot be undone.')) {
        doDelete();
      }
      return;
    }

    Alert.alert(
      'Delete Note',
      'Remove this note from your journal? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Journal</Text>
        {entries.length > 0 ? (
          <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
            <Text style={styles.exportButtonText}>Export</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        pinchGestureEnabled={false}
        maximumZoomScale={1}
        minimumZoomScale={1}
      >
        {entries.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nothing written yet.</Text>
            <Text style={styles.emptySubtext}>
              After a sitting, note whatever came up — it will collect here.
            </Text>
          </View>
        ) : (
          entries.map((entry) => {
            const isEditing = editingId === entry.id;
            return (
              <View key={entry.id} style={styles.entry}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryDate}>
                    {format(parseISO(entry.timestamp), 'MMMM d, yyyy · h:mm a')}
                  </Text>
                  {entry.sessionTitle && (
                    <Text style={styles.entrySession}>{entry.sessionTitle}</Text>
                  )}
                </View>

                {isEditing ? (
                  <>
                    <TextInput
                      style={styles.editInput}
                      value={editText}
                      onChangeText={setEditText}
                      multiline
                      textAlignVertical="top"
                      autoFocus
                    />
                    <View style={styles.entryActions}>
                      <TouchableOpacity style={styles.actionButton} onPress={cancelEdit}>
                        <Text style={styles.actionMuted}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButton} onPress={saveEdit}>
                        <Text style={styles.actionSave}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.entryText}>{entry.text}</Text>
                    <View style={styles.entryActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => startEdit(entry)}
                      >
                        <Text style={styles.actionEdit}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleShareNote(entry)}
                      >
                        <Text style={styles.actionShare}>Share</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => confirmDelete(entry)}
                      >
                        <Text style={styles.actionDelete}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.charcoal,
  },
  backButton: {
    paddingVertical: spacing.xs,
  },
  backButtonText: {
    color: colors.accent,
    fontSize: typography.fontSizes.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.medium,
  },
  headerSpacer: {
    width: 50,
  },
  exportButton: {
    paddingVertical: spacing.xs,
    minWidth: 50,
    alignItems: 'flex-end',
  },
  exportButtonText: {
    color: colors.accent,
    fontSize: typography.fontSizes.md,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.lg,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.sm,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: typography.fontSizes.sm * typography.lineHeights.relaxed,
  },
  entry: {
    backgroundColor: colors.ritualSurface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  entryHeader: {
    marginBottom: spacing.sm,
  },
  entryDate: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.xs,
  },
  entrySession: {
    color: colors.accent,
    fontSize: typography.fontSizes.sm,
    fontStyle: 'italic',
    marginTop: 2,
  },
  entryText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    lineHeight: typography.fontSizes.md * typography.lineHeights.relaxed,
  },
  editInput: {
    minHeight: 72,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.charcoal,
    padding: spacing.sm,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
  },
  entryActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  actionButton: {
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
  },
  actionEdit: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.xs,
    opacity: 0.7,
  },
  actionShare: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.xs,
    opacity: 0.7,
  },
  actionDelete: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.xs,
    opacity: 0.7,
  },
  actionMuted: {
    color: colors.textTertiary,
    fontSize: typography.fontSizes.xs,
    opacity: 0.7,
  },
  actionSave: {
    color: colors.accent,
    fontSize: typography.fontSizes.xs,
  },
});
