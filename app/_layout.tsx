import React, { Component, ReactNode, Suspense } from 'react';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { migrate } from '../src/db/repository';
import { StoreProvider, useStore } from '../src/store';
import { Button, Busy, Screen, T, useTheme } from '../src/ui';
class Boundary extends Component<{ children: ReactNode }, { error: string }> {
  state = { error: '' };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    return this.state.error ? (
      <Screen>
        <T large>データを開けませんでした</T>
        <T>{this.state.error}</T>
        <T muted>保存データは削除していません。アプリを再起動してください。</T>
      </Screen>
    ) : (
      this.props.children
    );
  }
}
function Navigation() {
  const c = useTheme();
  const store = useStore();
  if (!store.ready)
    return (
      <Screen>
        <T large>MONOTE</T>
        {store.error ? (
          <>
            <T>{store.error}</T>
            <T muted>アプリを再起動してください。データは削除されていません。</T>
          </>
        ) : (
          <Busy />
        )}
      </Screen>
    );
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.bg },
          headerTintColor: c.text,
          contentStyle: { backgroundColor: c.bg },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="index" options={{ title: 'MONOTE' }} />
        <Stack.Screen name="books/index" options={{ title: '本棚' }} />
        <Stack.Screen name="books/[id]" options={{ title: '書籍' }} />
        <Stack.Screen name="books/edit" options={{ title: '書籍の登録・編集' }} />
        <Stack.Screen name="memos/[id]" options={{ title: 'メモ' }} />
        <Stack.Screen name="memos/edit" options={{ title: 'メモを書く' }} />
        <Stack.Screen
          name="voice"
          options={{
            title: '音声メモ',
            gestureEnabled: store.voice.status !== 'recording',
            headerLeft: store.voice.status === 'recording' ? () => null : undefined,
          }}
        />
        <Stack.Screen name="settings" options={{ title: '設定' }} />
        <Stack.Screen name="drafts" options={{ title: '保護された下書き' }} />
      </Stack>
    </>
  );
}
export default function Root() {
  return (
    <Boundary>
      <Suspense
        fallback={
          <Screen>
            <Busy />
          </Screen>
        }
      >
        <SQLiteProvider databaseName="monote.db" onInit={migrate} useSuspense>
          <StoreProvider>
            <Navigation />
          </StoreProvider>
        </SQLiteProvider>
      </Suspense>
    </Boundary>
  );
}
