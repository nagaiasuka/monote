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
        bg: '#201E1B',
        card: '#2D2924',
        text: '#F4EBDE',
        muted: '#C0B3A3',
        accent: '#DFB787',
        line: '#51483D',
        danger: '#F1A698',
        onAccent: '#201E1B',
      }
    : {
        bg: '#F8F3EB',
        card: '#FFFDF8',
        text: '#352E26',
        muted: '#756B5F',
        accent: '#805A36',
        line: '#DDD2C2',
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
        fontSize: large ? 28 : 17,
        lineHeight: large ? 38 : 27,
        fontWeight: large ? '600' : '400',
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
          backgroundColor: secondary ? 'transparent' : color,
          borderColor: color,
          opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: secondary ? color : c.onAccent,
          fontSize: 17,
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
      <T muted>{label}</T>
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
    <Link href={href} style={{ color: c.accent, fontSize: 18, paddingVertical: 12 }}>
      {title} →
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
  return (
    <Card>
      <View style={styles.row}>
        <Cover book={book} />
        <View style={{ flex: 1 }}>
          <T>{book.title}</T>
          <T muted>{book.author || '著者未登録'}</T>
          {!!book.is_current && <T muted>いま聴いている本</T>}
          <Nav href={{ pathname: '/books/[id]', params: { id: book.id } }} title="本を開く" />
        </View>
      </View>
    </Card>
  );
}
export function MemoCard({ memo, title }: { memo: Memo; title?: string }) {
  const c = useTheme();
  return (
    <Link href={{ pathname: '/memos/[id]', params: { id: memo.id } }} asChild>
      <Pressable accessibilityRole="button">
        <Card>
          {title && <T muted>{title}</T>}
          <Text numberOfLines={3} style={{ color: c.text, fontSize: 18, lineHeight: 28 }}>
            {memo.content}
          </Text>
          <T muted>{dateLabel(memo.created_at)}</T>
        </Card>
      </Pressable>
    </Link>
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
  screen: { padding: 24, paddingBottom: 56, gap: 20 },
  card: { borderWidth: 1, borderRadius: 18, padding: 20, gap: 12 },
  button: {
    minHeight: 52,
    padding: 15,
    borderWidth: 1,
    borderRadius: 14,
    justifyContent: 'center',
  },
  input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 18, lineHeight: 28 },
  cover: { width: 76, height: 110, borderRadius: 7 },
  row: { flexDirection: 'row', gap: 18, alignItems: 'center' },
});
