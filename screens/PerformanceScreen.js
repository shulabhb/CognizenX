import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";

import { API_BASE_URL } from "../config/backend";
import { getGameById } from "../constants/gamesRegistry";
import { colors, radii, spacing, type } from "../styles/theme";
import { ui } from "../styles/ui";
import { getStoredSessionToken } from "../utils/session";

const RANGE_OPTIONS = [7, 14, 30];
const CHART_HEIGHT = 140;
const TREND_STROKE = 2;
const TREND_DOT = 7;

function safePct(numerator, denominator) {
  if (!denominator) return 0;
  return (numerator / denominator) * 100;
}

function formatSecondsFromMs(ms) {
  if (ms == null || Number.isNaN(Number(ms))) return "—";
  const seconds = Number(ms) / 1000;
  if (!Number.isFinite(seconds)) return "—";
  return `${seconds.toFixed(1)}s`;
}

function toDayStringUTC(date) {
  const d = new Date(date);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysUTC(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function buildDailySeries(days, rawSeries) {
  const byDate = new Map((rawSeries || []).map((row) => [row.date, row]));
  const now = new Date();
  const start = addDaysUTC(now, -days + 1);
  start.setUTCHours(0, 0, 0, 0);

  const filled = [];
  for (let i = 0; i < days; i += 1) {
    const day = addDaysUTC(start, i);
    const key = toDayStringUTC(day);
    const existing = byDate.get(key);
    filled.push(
      existing || {
        date: key,
        totalAttempts: 0,
        correctCount: 0,
        incorrectCount: 0,
        avgTimeTakenMs: null,
      }
    );
  }
  return filled;
}

function buildGameDailySeries(days, rawSeries) {
  const byDate = new Map((rawSeries || []).map((row) => [row.date, row]));
  const now = new Date();
  const start = addDaysUTC(now, -days + 1);
  start.setUTCHours(0, 0, 0, 0);

  const filled = [];
  for (let i = 0; i < days; i += 1) {
    const day = addDaysUTC(start, i);
    const key = toDayStringUTC(day);
    const existing = byDate.get(key);
    filled.push(
      existing || {
        date: key,
        totalSessions: 0,
        completedSessions: 0,
        totalDurationMs: 0,
      }
    );
  }
  return filled;
}

const PerformanceScreen = ({ navigation }) => {
  const [metricsDays, setMetricsDays] = useState(14);
  const [dailySeries, setDailySeries] = useState([]);
  const [gameDailySeries, setGameDailySeries] = useState([]);
  const [gameSummary, setGameSummary] = useState({
    totalSessions: 0,
    sessionsThisWeek: 0,
    minutesThisWeek: 0,
    favoriteGameId: null,
  });
  const [loading, setLoading] = useState(true);
  const [chartWidth, setChartWidth] = useState(0);
  const [gameChartWidth, setGameChartWidth] = useState(0);
  const [trendTooltip, setTrendTooltip] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sessionToken = await getStoredSessionToken();
      if (!sessionToken) {
        setDailySeries(buildDailySeries(metricsDays, []));
        setGameDailySeries(buildGameDailySeries(metricsDays, []));
        setGameSummary({ totalSessions: 0, sessionsThisWeek: 0, minutesThisWeek: 0, favoriteGameId: null });
        return;
      }

      const headers = { Authorization: `Bearer ${sessionToken}` };
      const [quizResult, gameDailyResult, gameSummaryResult] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/trivia/metrics/daily`, {
          headers,
          params: { days: metricsDays },
        }),
        axios.get(`${API_BASE_URL}/api/games/metrics/daily`, {
          headers,
          params: { days: metricsDays },
        }),
        axios.get(`${API_BASE_URL}/api/games/metrics/summary`, { headers }),
      ]);

      if (quizResult.status === "fulfilled") {
        setDailySeries(buildDailySeries(metricsDays, quizResult.value?.data?.series || []));
      } else {
        console.error("Quiz metrics load error:", quizResult.reason);
        setDailySeries(buildDailySeries(metricsDays, []));
      }

      if (gameDailyResult.status === "fulfilled") {
        setGameDailySeries(buildGameDailySeries(metricsDays, gameDailyResult.value?.data?.series || []));
      } else {
        console.error("Game daily metrics load error:", gameDailyResult.reason);
        setGameDailySeries(buildGameDailySeries(metricsDays, []));
      }

      if (gameSummaryResult.status === "fulfilled") {
        setGameSummary({
          totalSessions: gameSummaryResult.value?.data?.totalSessions || 0,
          sessionsThisWeek: gameSummaryResult.value?.data?.sessionsThisWeek || 0,
          minutesThisWeek: gameSummaryResult.value?.data?.minutesThisWeek || 0,
          favoriteGameId: gameSummaryResult.value?.data?.favoriteGameId || null,
        });
      } else {
        console.error("Game summary load error:", gameSummaryResult.reason);
        setGameSummary({ totalSessions: 0, sessionsThisWeek: 0, minutesThisWeek: 0, favoriteGameId: null });
      }
    } catch (error) {
      console.error("Performance load error:", error);
      setDailySeries(buildDailySeries(metricsDays, []));
      setGameDailySeries(buildGameDailySeries(metricsDays, []));
      setGameSummary({ totalSessions: 0, sessionsThisWeek: 0, minutesThisWeek: 0, favoriteGameId: null });
    } finally {
      setLoading(false);
    }
  }, [metricsDays]);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {};
    }, [load])
  );

  const computed = useMemo(() => {
    const totalAttempts = dailySeries.reduce((acc, item) => acc + (item.totalAttempts || 0), 0);
    const correctCount = dailySeries.reduce((acc, item) => acc + (item.correctCount || 0), 0);
    const incorrectCount = dailySeries.reduce((acc, item) => acc + (item.incorrectCount || 0), 0);
    const timeWeightedSum = dailySeries.reduce((acc, item) => {
      if (!item.totalAttempts || item.avgTimeTakenMs == null) return acc;
      return acc + item.avgTimeTakenMs * item.totalAttempts;
    }, 0);

    const overallAvgTimeMs = totalAttempts ? Math.round(timeWeightedSum / totalAttempts) : null;
    const overallAccuracyPct = safePct(correctCount, totalAttempts);

    const splitIndex = Math.max(1, Math.floor(dailySeries.length / 2));
    const recent = dailySeries.slice(-splitIndex);
    const previous = dailySeries.slice(0, dailySeries.length - splitIndex);
    const recentAttempts = recent.reduce((acc, item) => acc + (item.totalAttempts || 0), 0);
    const recentCorrect = recent.reduce((acc, item) => acc + (item.correctCount || 0), 0);
    const previousAttempts = previous.reduce((acc, item) => acc + (item.totalAttempts || 0), 0);
    const previousCorrect = previous.reduce((acc, item) => acc + (item.correctCount || 0), 0);
    const recentAccuracyPct = safePct(recentCorrect, recentAttempts);
    const previousAccuracyPct = safePct(previousCorrect, previousAttempts);

    return {
      totalAttempts,
      correctCount,
      incorrectCount,
      overallAvgTimeMs,
      overallAccuracyPct,
      recentAccuracyPct,
      deltaAccuracyPct: recentAccuracyPct - previousAccuracyPct,
    };
  }, [dailySeries]);

  const gameComputed = useMemo(() => {
    const totalSessions = gameDailySeries.reduce((acc, item) => acc + (item.totalSessions || 0), 0);
    const completedSessions = gameDailySeries.reduce((acc, item) => acc + (item.completedSessions || 0), 0);
    const totalMinutes = Math.round(
      gameDailySeries.reduce((acc, item) => acc + (item.totalDurationMs || 0), 0) / 60000
    );
    const favoriteGame = getGameById(gameSummary.favoriteGameId);
    return {
      totalSessions,
      completedSessions,
      totalMinutes,
      favoriteGameTitle: favoriteGame?.title || "—",
      sessionsThisWeek: gameSummary.sessionsThisWeek,
      minutesThisWeek: gameSummary.minutesThisWeek,
    };
  }, [gameDailySeries, gameSummary]);

  const gameChartMax = useMemo(
    () => Math.max(...gameDailySeries.map((item) => item.totalSessions || 0), 0),
    [gameDailySeries]
  );

  const chartData = useMemo(() => {
    const maxAttempts = Math.max(...dailySeries.map((item) => item.totalAttempts || 0), 0);
    const step = chartWidth && dailySeries.length ? chartWidth / dailySeries.length : 0;

    const points = dailySeries.map((item, index) => {
      const total = item.totalAttempts || 0;
      if (!total || !step) return null;
      const rate = Math.min(1, Math.max(0, (item.correctCount || 0) / total));
      return {
        index,
        date: item.date,
        x: step * index + step / 2,
        y: CHART_HEIGHT - rate * CHART_HEIGHT,
        rate,
        totalAttempts: total,
        correctCount: item.correctCount || 0,
        incorrectCount: item.incorrectCount || 0,
      };
    });

    return { maxAttempts, points };
  }, [chartWidth, dailySeries]);

  const trendSegments = [];
  let previousPoint = null;
  let previousIndex = null;
  for (let index = 0; index < chartData.points.length; index += 1) {
    const point = chartData.points[index];
    if (!point) continue;

    if (previousPoint && previousIndex != null) {
      const dx = point.x - previousPoint.x;
      const dy = point.y - previousPoint.y;
      const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const angle = Math.atan2(dy, dx);
      const midX = (previousPoint.x + point.x) / 2;
      const midY = (previousPoint.y + point.y) / 2;
      trendSegments.push(
        <View
          key={`segment-${previousIndex}-${index}`}
          style={[
            styles.trendSegment,
            {
              width: length,
              left: midX - length / 2,
              top: midY - TREND_STROKE / 2,
              transform: [{ rotateZ: `${angle}rad` }],
            },
          ]}
        />
      );
    }

    previousPoint = point;
    previousIndex = index;
  }

  const tooltip = (() => {
    if (!trendTooltip || !chartWidth) return null;
    const tooltipWidth = 178;
    const tooltipHeight = 74;
    const left = Math.min(Math.max(trendTooltip.x - tooltipWidth / 2, 0), chartWidth - tooltipWidth);
    const top = Math.min(Math.max(trendTooltip.y - tooltipHeight - 10, 0), CHART_HEIGHT - tooltipHeight);
    return (
      <View pointerEvents="none" style={[styles.tooltip, { width: tooltipWidth, left, top }]}>
        <Text style={styles.tooltipTitle}>{(trendTooltip.rate * 100).toFixed(1)}% correct</Text>
        <Text style={styles.tooltipText}>Correct: {trendTooltip.correctCount}</Text>
        <Text style={styles.tooltipText}>Incorrect: {trendTooltip.incorrectCount}</Text>
      </View>
    );
  })();

  return (
    <SafeAreaView style={ui.screenTint}>
      <View style={[ui.headerRow, styles.header]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={ui.iconButton}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={ui.headerTitleLg}>Progress</Text>
        <View style={ui.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={ui.sectionCard}>
          <Text style={styles.heroEyebrow}>Insight overview</Text>
          <Text style={styles.heroTitle}>See how each quiz session adds up over time.</Text>
          <Text style={styles.heroBody}>
            Track your correct rate, average response time, and progress patterns in one place.
          </Text>

          <View style={styles.rangeRow}>
            {RANGE_OPTIONS.map((days) => {
              const isActive = metricsDays === days;
              return (
                <TouchableOpacity
                  key={days}
                  style={[styles.rangePill, isActive ? styles.rangePillActive : styles.rangePillInactive]}
                  onPress={() => setMetricsDays(days)}
                >
                  <Text style={[styles.rangePillText, isActive ? styles.rangePillTextActive : styles.rangePillTextInactive]}>
                    {days} days
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        ) : (
          <>
            <View style={ui.sectionCard}>
              <Text style={styles.sectionTitle}>Key metrics</Text>
              <View style={styles.kpiGrid}>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Correct rate</Text>
                  <Text style={styles.kpiValue}>{computed.overallAccuracyPct.toFixed(1)}%</Text>
                  <Text
                    style={[
                      styles.kpiHint,
                      computed.deltaAccuracyPct >= 0 ? styles.kpiHintPositive : styles.kpiHintNegative,
                    ]}
                  >
                    {computed.deltaAccuracyPct >= 0 ? "+" : ""}
                    {computed.deltaAccuracyPct.toFixed(1)} pts vs earlier window
                  </Text>
                </View>

                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Avg time</Text>
                  <Text style={styles.kpiValue}>{formatSecondsFromMs(computed.overallAvgTimeMs)}</Text>
                  <Text style={styles.kpiHint}>per question</Text>
                </View>

                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Attempts</Text>
                  <Text style={styles.kpiValue}>{computed.totalAttempts}</Text>
                  <Text style={styles.kpiHint}>total answered</Text>
                </View>

                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Correct / Incorrect</Text>
                  <Text style={styles.kpiValue}>
                    {computed.correctCount} / {computed.incorrectCount}
                  </Text>
                  <Text style={styles.kpiHint}>question counts</Text>
                </View>
              </View>
            </View>

            <View style={ui.sectionCard}>
              <Text style={styles.sectionTitle}>Accuracy over time</Text>
              <Text style={[ui.textCaption, { marginTop: spacing.xs }]}>
                Bars show daily activity. The line tracks your correct rate.
              </Text>

              {computed.totalAttempts === 0 ? (
                <View style={styles.emptyWrap}>
                  <Text style={ui.textBodySm}>No performance data yet in this range.</Text>
                </View>
              ) : (
                <View style={styles.chartWrap}>
                  <View
                    style={styles.chartArea}
                    onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}
                  >
                    {dailySeries.map((item) => {
                      const total = item.totalAttempts || 0;
                      const scaledHeight = chartData.maxAttempts
                        ? Math.max(2, Math.round((total / chartData.maxAttempts) * CHART_HEIGHT))
                        : 2;
                      const correctHeight = total ? Math.round((item.correctCount / total) * scaledHeight) : 0;
                      const incorrectHeight = Math.max(0, scaledHeight - correctHeight);

                      return (
                        <View key={item.date} style={styles.chartColumn}>
                          <View style={[styles.bar, { height: scaledHeight }]}>
                            <View style={[styles.barIncorrect, { height: incorrectHeight }]} />
                            <View style={[styles.barCorrect, { height: correctHeight }]} />
                          </View>
                        </View>
                      );
                    })}

                    {chartWidth > 0 ? (
                      <View pointerEvents="box-none" style={styles.trendOverlay}>
                        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                          {trendSegments}
                          {tooltip}
                        </View>
                        {chartData.points.map((point) => {
                          if (!point) return null;
                          const isSelected = trendTooltip?.date === point.date;
                          return (
                            <Pressable
                              key={`point-${point.date}`}
                              hitSlop={12}
                              delayLongPress={180}
                              onLongPress={() => setTrendTooltip(point)}
                              onPressOut={() => setTrendTooltip(null)}
                              style={[
                                styles.trendDot,
                                {
                                  left: point.x - TREND_DOT / 2,
                                  top: point.y - TREND_DOT / 2,
                                  width: TREND_DOT,
                                  height: TREND_DOT,
                                  borderRadius: TREND_DOT / 2,
                                  borderWidth: isSelected ? 2 : 1,
                                },
                              ]}
                            />
                          );
                        })}
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.ticksRow}>
                    {dailySeries.map((item, index) => {
                      const showTick =
                        index === 0 ||
                        index === Math.floor(dailySeries.length / 2) ||
                        index === dailySeries.length - 1;
                      return (
                        <View key={`tick-${item.date}`} style={styles.tickColumn}>
                          <Text style={styles.tickLabel}>{showTick ? item.date.slice(5) : ""}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendSwatch, { backgroundColor: colors.success }]} />
                  <Text style={styles.legendText}>Correct</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendSwatch, { backgroundColor: colors.danger }]} />
                  <Text style={styles.legendText}>Incorrect</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={styles.legendLineSwatch} />
                  <Text style={styles.legendText}>Correct rate</Text>
                </View>
              </View>
            </View>

            <View style={ui.sectionCard}>
              <Text style={styles.sectionTitle}>Games activity</Text>
              <Text style={[ui.textCaption, { marginTop: spacing.xs }]}>
                Brain games and calm play sessions tracked separately from quiz attempts.
              </Text>

              <View style={[styles.kpiGrid, { marginTop: spacing.lg }]}>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Game sessions</Text>
                  <Text style={styles.kpiValue}>{gameComputed.totalSessions}</Text>
                  <Text style={styles.kpiHint}>in selected range</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Minutes played</Text>
                  <Text style={styles.kpiValue}>{gameComputed.totalMinutes}</Text>
                  <Text style={styles.kpiHint}>estimated total</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>This week</Text>
                  <Text style={styles.kpiValue}>{gameComputed.minutesThisWeek}m</Text>
                  <Text style={styles.kpiHint}>minutes played</Text>
                </View>
                <View style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>Most played</Text>
                  <Text style={[styles.kpiValue, styles.kpiValueCompact]}>{gameComputed.favoriteGameTitle}</Text>
                  <Text style={styles.kpiHint}>favorite game</Text>
                </View>
              </View>

              {gameComputed.totalSessions === 0 ? (
                <View style={styles.emptyWrap}>
                  <Text style={ui.textBodySm}>No game sessions yet in this range.</Text>
                </View>
              ) : (
                <View style={styles.chartWrap}>
                  <View
                    style={styles.chartArea}
                    onLayout={(event) => setGameChartWidth(event.nativeEvent.layout.width)}
                  >
                    {gameDailySeries.map((item) => {
                      const total = item.totalSessions || 0;
                      const scaledHeight = gameChartMax
                        ? Math.max(2, Math.round((total / gameChartMax) * CHART_HEIGHT))
                        : 2;
                      return (
                        <View key={`game-${item.date}`} style={styles.chartColumn}>
                          <View style={[styles.bar, { height: scaledHeight, backgroundColor: colors.brandTint }]}>
                            <View style={[styles.barCorrect, { height: scaledHeight, backgroundColor: colors.brand }]} />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                  {gameChartWidth > 0 ? (
                    <View style={styles.ticksRow}>
                      {gameDailySeries.map((item, index) => {
                        const showTick =
                          index === 0 ||
                          index === Math.floor(gameDailySeries.length / 2) ||
                          index === gameDailySeries.length - 1;
                        return (
                          <View key={`game-tick-${item.date}`} style={styles.tickColumn}>
                            <Text style={styles.tickLabel}>{showTick ? item.date.slice(5) : ""}</Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              )}
            </View>

            <View style={ui.sectionCard}>
              <Text style={styles.sectionTitle}>Daily breakdown</Text>
              <View style={styles.dayList}>
                {dailySeries
                  .slice()
                  .reverse()
                  .map((item) => {
                    const accuracy = safePct(item.correctCount || 0, item.totalAttempts || 0);
                    return (
                      <View key={`day-row-${item.date}`} style={styles.dayRow}>
                        <View>
                          <Text style={styles.dayLabel}>{item.date}</Text>
                          <Text style={styles.dayMeta}>{item.totalAttempts || 0} attempts</Text>
                        </View>
                        <View style={styles.dayValues}>
                          <Text style={styles.dayAccuracy}>{accuracy.toFixed(0)}%</Text>
                          <Text style={styles.dayTime}>{formatSecondsFromMs(item.avgTimeTakenMs)}</Text>
                        </View>
                      </View>
                    );
                  })}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.backgroundTint,
  },
  backIcon: {
    fontSize: 32,
    color: colors.textSecondary,
    marginTop: -2,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  heroEyebrow: {
    fontSize: type.caption,
    fontWeight: "700",
    color: colors.brandDark,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  heroTitle: {
    marginTop: spacing.sm,
    fontSize: 26,
    fontWeight: "800",
    color: colors.textPrimary,
    lineHeight: 34,
  },
  heroBody: {
    marginTop: spacing.sm,
    fontSize: type.body,
    lineHeight: 26,
    color: colors.textMuted,
  },
  rangeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  rangePill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  rangePillActive: {
    backgroundColor: colors.brandSelectedBg,
    borderColor: colors.brandBorder,
  },
  rangePillInactive: {
    backgroundColor: colors.white,
    borderColor: colors.slate200,
  },
  rangePillText: {
    fontSize: type.bodySm,
    fontWeight: "700",
  },
  rangePillTextActive: {
    color: colors.brandSelectedText,
  },
  rangePillTextInactive: {
    color: colors.textSecondary,
  },
  loadingWrap: {
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textSecondary,
  },
  kpiGrid: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  kpiCard: {
    backgroundColor: colors.slate50,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  kpiLabel: {
    fontSize: type.caption,
    color: colors.textMuted,
  },
  kpiValue: {
    marginTop: spacing.sm,
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  kpiValueCompact: {
    fontSize: 18,
    lineHeight: 24,
  },
  kpiHint: {
    marginTop: spacing.xs,
    fontSize: type.caption,
    color: colors.textMuted,
    fontWeight: "600",
  },
  kpiHintPositive: {
    color: colors.successDark,
  },
  kpiHintNegative: {
    color: colors.dangerDark,
  },
  emptyWrap: {
    marginTop: spacing.lg,
  },
  chartWrap: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  chartArea: {
    height: CHART_HEIGHT,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 6,
    position: "relative",
  },
  chartColumn: {
    alignItems: "center",
    flex: 1,
  },
  bar: {
    width: 10,
    borderRadius: 6,
    backgroundColor: colors.slate200,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  barIncorrect: {
    width: "100%",
    backgroundColor: colors.danger,
  },
  barCorrect: {
    width: "100%",
    backgroundColor: colors.success,
  },
  trendOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  trendSegment: {
    position: "absolute",
    height: TREND_STROKE,
    borderRadius: 999,
    backgroundColor: colors.brandDark,
  },
  trendDot: {
    position: "absolute",
    backgroundColor: colors.brandDark,
    borderColor: colors.surface,
  },
  tooltip: {
    position: "absolute",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.slate800,
    borderWidth: 1,
    borderColor: colors.slate700,
  },
  tooltipTitle: {
    color: colors.white,
    fontSize: type.caption,
    fontWeight: "800",
  },
  tooltipText: {
    marginTop: 2,
    color: colors.white,
    fontSize: type.caption,
    fontWeight: "600",
  },
  ticksRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  tickColumn: {
    flex: 1,
    alignItems: "center",
  },
  tickLabel: {
    marginTop: spacing.xs,
    fontSize: 10,
    color: colors.textMuted,
  },
  legendRow: {
    marginTop: spacing.lg,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendLineSwatch: {
    width: 14,
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.brandDark,
  },
  legendText: {
    fontSize: type.caption,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  dayList: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.slate50,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  dayLabel: {
    fontSize: type.body,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  dayMeta: {
    marginTop: 2,
    fontSize: type.caption,
    color: colors.textMuted,
  },
  dayValues: {
    alignItems: "flex-end",
  },
  dayAccuracy: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.brandDark,
  },
  dayTime: {
    marginTop: 2,
    fontSize: type.caption,
    color: colors.textMuted,
  },
});

export default PerformanceScreen;
