/**
 * 单词详情页面
 * 显示动词变位、名词信息、学习进度等
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Chip, DataTable, IconButton } from 'react-native-paper';
import * as Speech from 'expo-speech';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../store';
import type { VerbConjugation, ConjugationPersons } from '../types';

const PERSONS = ['ik', 'jij', 'hij', 'wij', 'jullie', 'zij'] as const;
const PERSON_LABELS: Record<string, string> = {
  ik: 'ik',
  jij: 'jij/je',
  hij: 'hij/zij/het',
  wij: 'wij/we',
  jullie: 'jullie',
  zij: 'zij (mv.)',
};

function ConjugationTable({ title, tense }: { title: string; tense: ConjugationPersons }) {
  return (
    <Card style={styles.tableCard}>
      <Card.Content>
        <Text variant="titleSmall" style={styles.tenseTitle}>{title}</Text>
        <DataTable>
          {PERSONS.map((person) => (
            <DataTable.Row key={person}>
              <DataTable.Cell>{PERSON_LABELS[person]}</DataTable.Cell>
              <DataTable.Cell>{tense[person]}</DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable>
      </Card.Content>
    </Card>
  );
}

function PerfectSection({ conjugation }: { conjugation: VerbConjugation }) {
  return (
    <Card style={styles.tableCard}>
      <Card.Content>
        <Text variant="titleSmall" style={styles.tenseTitle}>Voltooid (完成时)</Text>
        <DataTable>
          <DataTable.Row>
            <DataTable.Cell>助动词</DataTable.Cell>
            <DataTable.Cell>{conjugation.perfect.auxiliary}</DataTable.Cell>
          </DataTable.Row>
          <DataTable.Row>
            <DataTable.Cell>过去分词</DataTable.Cell>
            <DataTable.Cell>{conjugation.perfect.pastParticiple}</DataTable.Cell>
          </DataTable.Row>
        </DataTable>
      </Card.Content>
    </Card>
  );
}

export default function WordDetailScreen({ route, navigation }: any) {
  const { wordId } = route.params;
  const word = useAppStore((state) => state.words.find((w) => w.id === wordId));
  const record = useAppStore((state) => state.records.get(wordId));

  const speakDutch = useCallback(async () => {
    if (!word?.dutch) return;
    await Speech.stop();
    Speech.speak(word.dutch, { language: 'nl-NL', rate: 0.85, pitch: 1.05 });
  }, [word?.dutch]);

  if (!word) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>单词未找到</Text>
      </SafeAreaView>
    );
  }

  const nounArticle = word.nounInfo?.article ?? word.article;
  const hasNounInfo = !!(word.nounInfo || word.article);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Card style={styles.headerCard}>
          <Card.Content style={styles.headerContent}>
            <View style={styles.dutchRow}>
              <Text variant="displaySmall" style={styles.dutchWord}>
                {word.dutch}
              </Text>
              <IconButton
                icon="volume-high"
                size={28}
                onPress={speakDutch}
                iconColor="#FFFFFF"
                containerColor="#1E88E5"
                mode="contained"
              />
            </View>
            {word.pronunciation ? (
              <Text variant="bodyMedium" style={styles.pronunciation}>
                {word.pronunciation}
              </Text>
            ) : null}
            <Text variant="titleLarge" style={styles.chinese}>
              {word.chinese || '（暂无翻译）'}
            </Text>
            {word.partOfSpeech ? (
              <Chip style={styles.posChip} textStyle={styles.posChipText}>
                {word.partOfSpeech}
              </Chip>
            ) : null}
          </Card.Content>
        </Card>

        {/* Noun Info */}
        {hasNounInfo && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                名词信息
              </Text>
              <View style={styles.nounRow}>
                {nounArticle && (
                  <Chip
                    style={[
                      styles.articleChip,
                      nounArticle === 'de' ? styles.articleDe : styles.articleHet,
                    ]}
                    textStyle={styles.articleChipText}
                  >
                    {nounArticle}
                  </Chip>
                )}
                <Text variant="titleMedium" style={styles.nounWord}>
                  {word.dutch}
                </Text>
              </View>
              {word.nounInfo?.plural ? (
                <View style={styles.pluralRow}>
                  <Text variant="bodyMedium" style={styles.pluralLabel}>
                    复数 (meervoud):
                  </Text>
                  <Text variant="bodyLarge" style={styles.pluralValue}>
                    {word.nounInfo.plural}
                  </Text>
                </View>
              ) : null}
            </Card.Content>
          </Card>
        )}

        {/* Conjugation */}
        {word.conjugation && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                动词变位
              </Text>
            </Card.Content>
            <ConjugationTable
              title="Tegenwoordige tijd (现在时)"
              tense={word.conjugation.present}
            />
            <ConjugationTable
              title="Verleden tijd (过去时)"
              tense={word.conjugation.past}
            />
            <PerfectSection conjugation={word.conjugation} />
          </Card>
        )}

        {/* Example */}
        {word.example ? (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                例句
              </Text>
              <Text variant="bodyLarge" style={styles.exampleText}>
                {word.example}
              </Text>
              {word.exampleTranslation ? (
                <Text variant="bodyMedium" style={styles.exampleTranslation}>
                  {word.exampleTranslation}
                </Text>
              ) : null}
            </Card.Content>
          </Card>
        ) : null}

        {/* Learning Progress */}
        {record && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                学习进度
              </Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text variant="headlineSmall" style={styles.statValue}>
                    {Math.round(record.memoryStrength)}%
                  </Text>
                  <Text variant="bodySmall" style={styles.statLabel}>
                    记忆强度
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text variant="headlineSmall" style={styles.statValue}>
                    {record.reviewCount}
                  </Text>
                  <Text variant="bodySmall" style={styles.statLabel}>
                    复习次数
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text variant="headlineSmall" style={styles.statValue}>
                    {record.correctCount}
                  </Text>
                  <Text variant="bodySmall" style={styles.statLabel}>
                    正确次数
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Back button */}
        <View style={styles.backButtonContainer}>
          <Chip
            icon="arrow-left"
            onPress={() => navigation.goBack()}
            style={styles.backChip}
          >
            返回
          </Chip>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerCard: {
    borderRadius: 16,
    marginBottom: 12,
  },
  headerContent: {
    alignItems: 'center',
    padding: 24,
  },
  dutchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dutchWord: {
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  pronunciation: {
    color: '#888',
    marginTop: 4,
  },
  chinese: {
    marginTop: 12,
    color: '#FF6B35',
  },
  posChip: {
    marginTop: 8,
    backgroundColor: '#E8EAF6',
  },
  posChipText: {
    fontSize: 12,
  },
  sectionCard: {
    borderRadius: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 12,
  },
  nounRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  articleChip: {
    borderRadius: 8,
  },
  articleDe: {
    backgroundColor: '#E3F2FD',
  },
  articleHet: {
    backgroundColor: '#FFF3E0',
  },
  articleChipText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  nounWord: {
    color: '#333',
  },
  pluralRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  pluralLabel: {
    color: '#666',
  },
  pluralValue: {
    fontWeight: 'bold',
    color: '#333',
  },
  tableCard: {
    marginHorizontal: 0,
    marginBottom: 8,
    elevation: 0,
    backgroundColor: '#FAFAFA',
  },
  tenseTitle: {
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 4,
  },
  exampleText: {
    fontStyle: 'italic',
    color: '#333',
  },
  exampleTranslation: {
    color: '#666',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontWeight: 'bold',
    color: '#1E3A5F',
  },
  statLabel: {
    color: '#888',
    marginTop: 2,
  },
  backButtonContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  backChip: {
    backgroundColor: '#E0E0E0',
  },
});
