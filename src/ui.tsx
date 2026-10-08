import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  useColorScheme,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { Book, Memo, dateLabel, message } from './domain';
export function useTheme() {
  const dark = useColorScheme() === 'dark';
  return dark
    ? {
        bg: '#151918',
        card: '#202625',
        text: '#EFF2ED',
        muted: '#A0ADA6',
        accent: '#A8C6B7',
        line: '#323C37',
        danger: '#F1A698',
        onAccent: '#172820',
      }
    : {
        bg: '#F5F5F0',
        card: '#FFFFFF',
        text: '#263A32',
        muted: '#68766F',
        accent: '#385E4D',
        line: '#E2E7DF',
        danger: '#A13F35',
        onAccent: '#FFFFFF',
      };
}
export function T({
  children,
  muted,
  large,
}: {
  children: React.ReactNode;
  muted?: boolean;
  large?: boolean;
}) {
  const c = useTheme();
  return (
    <Text
      style={{
        color: muted ? c.muted : c.text,
        fontSize: large ? 26 : 16,
        lineHeight: large ? 36 : 25,
        fontWeight: large ? '600' : '400',
        letterSpacing: large ? -0.6 : 0.1,
      }}
    >
      {children}
    </Text>
  );
}
export function Screen({ children }: { children: React.ReactNode }) {
  const c = useTheme();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.screen}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
export function Card({ children }: { children: React.ReactNode }) {
  const c = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.line }]}>{children}</View>
  );
}
export function Button({
  title,
  onPress,
  disabled,
  secondary,
  danger,
}: {
  title: string;
  onPress(): void;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
}) {
  const c = useTheme();
  const color = danger ? c.danger : c.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: secondary ? c.card : color,
          borderColor: secondary ? c.line : color,
          opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: secondary ? color : c.onAccent,
          fontSize: 16,
          fontWeight: '600',
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const c = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: c.muted, fontSize: 13, fontWeight: '500' }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        {...props}
        style={[
          styles.input,
          { color: c.text, backgroundColor: c.card, borderColor: c.line },
          props.multiline && { minHeight: 180, textAlignVertical: 'top' },
          props.style,
        ]}
      />
    </View>
  );
}
export function Nav({
  href,
  title,
}: {
  href: React.ComponentProps<typeof Link>['href'];
  title: string;
}) {
  const c = useTheme();
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="link">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 48,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: c.accent, fontSize: 15, fontWeight: '500', flex: 1 }}>{title}</Text>
          <Text style={{ color: c.muted, fontSize: 22 }}>›</Text>
        </View>
      </Pressable>
    </Link>
  );
}
export function Cover({ book }: { book: Pick<Book, 'title' | 'cover_uri'> }) {
  const c = useTheme();
  return book.cover_uri ? (
    <Image
      source={{ uri: book.cover_uri }}
      accessibilityLabel={`${book.title}の表紙`}
      style={styles.cover}
    />
  ) : (
    <View
      style={[
        styles.cover,
        { backgroundColor: c.line, justifyContent: 'center', alignItems: 'center', padding: 8 },
      ]}
    >
      <Text style={{ color: c.text, fontSize: 26 }}>▤</Text>
      <Text numberOfLines={3} style={{ color: c.text, textAlign: 'center', fontSize: 12 }}>
        {book.title}
      </Text>
    </View>
  );
}
export function BookCard({ book }: { book: Book }) {
  const c = useTheme();
  return (
    <Link href={{ pathname: '/books/[id]', params: { id: book.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${book.title}を開く`}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Card>
          <View style={styles.row}>
            <Cover book={book} />
            <View style={{ flex: 1, gap: 6 }}>
              {!!book.is_current && (
                <Text
                  style={{ color: c.accent, fontSize: 11, fontWeight: '600', letterSpacing: 1 }}
                >
                  LISTENING NOW
                </Text>
              )}
              <Text
                numberOfLines={3}
                style={{ color: c.text, fontSize: 18, lineHeight: 26, fontWeight: '600' }}
              >
                {book.title}
              </Text>
              <Text style={{ color: c.muted, fontSize: 13 }}>{book.author || '著者未登録'}</Text>
            </View>
            <Text style={{ color: c.muted, fontSize: 22 }}>›</Text>
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}
export function MemoCard({ memo, title }: { memo: Memo; title?: string }) {
  const c = useTheme();
  return (
    <Link href={{ pathname: '/memos/[id]', params: { id: memo.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Card>
          {title && (
            <Text numberOfLines={1} style={{ color: c.accent, fontSize: 12, fontWeight: '500' }}>
              {title}
            </Text>
          )}
          <Text numberOfLines={3} style={{ color: c.text, fontSize: 16, lineHeight: 26 }}>
            {memo.content}
          </Text>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Text style={{ color: c.muted, fontSize: 12 }}>{dateLabel(memo.created_at)}</Text>
            <Text style={{ color: c.muted, fontSize: 18 }}>↗</Text>
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}
export function SectionLabel({ children }: { children: React.ReactNode }) {
  const c = useTheme();
  return (
    <Text style={{ color: c.muted, fontSize: 12, fontWeight: '600', letterSpacing: 1.2 }}>
      {children}
    </Text>
  );
}
export function Microphone({ color }: { color: string }) {
  return (
    <View accessible={false} style={{ width: 28, height: 34, alignItems: 'center' }}>
      <View
        style={{ width: 11, height: 19, borderWidth: 1.7, borderColor: color, borderRadius: 8 }}
      />
      <View
        style={{
          position: 'absolute',
          top: 10,
          width: 21,
          height: 16,
          borderWidth: 1.7,
          borderTopWidth: 0,
          borderColor: color,
          borderBottomLeftRadius: 12,
          borderBottomRightRadius: 12,
        }}
      />
      <View style={{ width: 1.7, height: 6, backgroundColor: color, marginTop: 6 }} />
      <View style={{ width: 11, height: 1.7, backgroundColor: color }} />
    </View>
  );
}
export function Busy() {
  const c = useTheme();
  return <ActivityIndicator size="large" color={c.accent} />;
}
export function report(error: unknown) {
  Alert.alert('MONOTE', message(error));
}
export function confirmDelete(title: string, text: string, action: () => Promise<unknown>) {
  Alert.alert(title, text, [
    { text: 'キャンセル', style: 'cancel' },
    {
      text: '削除',
      style: 'destructive',
      onPress: () => {
        void action().catch(report);
      },
    },
  ]);
}
export const styles = StyleSheet.create({
  screen: { padding: 24, paddingTop: 28, paddingBottom: 48, gap: 18 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 20, padding: 20, gap: 12 },
  button: {
    minHeight: 52,
    padding: 15,
    borderWidth: 1,
    borderRadius: 16,
    justifyContent: 'center',
  },
  input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16, lineHeight: 26 },
  cover: { width: 64, height: 92, borderRadius: 6 },
  row: { flexDirection: 'row', gap: 16, alignItems: 'center' },
});
