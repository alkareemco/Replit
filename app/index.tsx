import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  Platform,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  interpolate,
  FadeIn,
} from "react-native-reanimated";
import Colors from "@/constants/colors";
import { getGroupedSchedule, type DayGroup, type Session } from "@/data/schedule";

const TOTAL_SESSIONS = 300;
const STORAGE_KEY = "quranProgress";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface ProgressData {
  completed: number[];
  startDate: string;
  sessionsPerDay: number;
}

function SessionItem({
  session,
  isCompleted,
  onToggle,
}: {
  session: Session & { index: number };
  isCompleted: boolean;
  onToggle: () => void;
}) {
  const scale = useSharedValue(1);
  const checkScale = useSharedValue(isCompleted ? 1 : 0);

  useEffect(() => {
    checkScale.value = withSpring(isCompleted ? 1 : 0, { damping: 12 });
  }, [isCompleted]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  const handlePress = () => {
    scale.value = withSpring(0.95, { damping: 10 }, () => {
      scale.value = withSpring(1, { damping: 10 });
    });
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onToggle();
  };

  return (
    <Animated.View style={containerStyle}>
      <Pressable onPress={handlePress}>
        <View
          style={[
            styles.sessionItem,
            isCompleted && styles.sessionItemCompleted,
          ]}
        >
          <View style={styles.sessionLeft}>
            <View style={styles.sessionHeader}>
              <Text
                style={[
                  styles.sessionTitle,
                  isCompleted && styles.sessionTitleCompleted,
                ]}
              >
                Session {session.session}
              </Text>
              <View style={styles.pagesBadge}>
                <Text style={styles.pagesText}>p. {session.pages}</Text>
              </View>
            </View>
            <View style={styles.surahRow}>
              <Feather name="book-open" size={12} color={Colors.textSecondary} />
              <Text style={styles.surahText} numberOfLines={1}>
                {session.startSurah}
              </Text>
            </View>
            <View style={styles.surahRow}>
              <Feather name="arrow-right" size={12} color={Colors.textSecondary} />
              <Text style={styles.surahText} numberOfLines={1}>
                {session.endSurah}
              </Text>
            </View>
          </View>
          <Pressable onPress={handlePress} style={styles.checkButton}>
            {isCompleted ? (
              <Animated.View style={checkStyle}>
                <LinearGradient
                  colors={["#10B981", "#059669"]}
                  style={styles.checkCircleFilled}
                >
                  <Ionicons name="checkmark" size={18} color="#fff" />
                </LinearGradient>
              </Animated.View>
            ) : (
              <View style={styles.checkCircleEmpty} />
            )}
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function DayCard({
  dayGroup,
  completedSet,
  expandedDay,
  onExpand,
  onToggleSession,
}: {
  dayGroup: DayGroup;
  completedSet: Set<number>;
  expandedDay: number | null;
  onExpand: (day: number) => void;
  onToggleSession: (index: number) => void;
}) {
  const isExpanded = expandedDay === dayGroup.day;
  const completedCount = dayGroup.sessions.filter((s) =>
    completedSet.has(s.index)
  ).length;
  const totalSessions = dayGroup.sessions.length;
  const isDayComplete = completedCount === totalSessions;
  const progress = completedCount / totalSessions;

  const expandAnim = useSharedValue(isExpanded ? 1 : 0);

  useEffect(() => {
    expandAnim.value = withTiming(isExpanded ? 1 : 0, { duration: 250 });
  }, [isExpanded]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(expandAnim.value, [0, 1], [0, 180])}deg` },
    ],
  }));

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onExpand(dayGroup.day);
  };

  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <View style={[styles.dayCard, isDayComplete && styles.dayCardComplete]}>
        <Pressable onPress={handlePress} style={styles.dayCardHeader}>
          <View style={styles.dayLeftSection}>
            <View
              style={[
                styles.dayNumberCircle,
                isDayComplete && styles.dayNumberCircleComplete,
              ]}
            >
              {isDayComplete ? (
                <Ionicons name="checkmark" size={16} color="#fff" />
              ) : (
                <Text style={styles.dayNumberText}>{dayGroup.day}</Text>
              )}
            </View>
            <View style={styles.dayInfo}>
              <Text style={styles.dayTitle}>Day {dayGroup.day}</Text>
              <Text style={styles.daySubtitle}>
                {completedCount}/{totalSessions} sessions
              </Text>
            </View>
          </View>
          <View style={styles.dayRightSection}>
            <View style={styles.miniProgressBar}>
              <View
                style={[
                  styles.miniProgressFill,
                  {
                    width: `${progress * 100}%`,
                    backgroundColor: isDayComplete
                      ? Colors.emerald
                      : Colors.neonGreen,
                  },
                ]}
              />
            </View>
            <Animated.View style={chevronStyle}>
              <Ionicons
                name="chevron-down"
                size={20}
                color={Colors.textSecondary}
              />
            </Animated.View>
          </View>
        </Pressable>

        {isExpanded && (
          <View style={styles.sessionsContainer}>
            {dayGroup.sessions.map((session) => (
              <SessionItem
                key={session.index}
                session={session}
                isCompleted={completedSet.has(session.index)}
                onToggle={() => onToggleSession(session.index)}
              />
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [completedSessions, setCompletedSessions] = useState<Set<number>>(
    new Set()
  );
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const dayGroups = useMemo(() => getGroupedSchedule(), []);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data: ProgressData = JSON.parse(saved);
        setCompletedSessions(new Set(data.completed || []));
      }
    } catch (e) {
      console.error("Failed to load progress", e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProgress = async (completed: Set<number>) => {
    try {
      const data: ProgressData = {
        completed: Array.from(completed),
        startDate: "",
        sessionsPerDay: 5,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to save progress", e);
    }
  };

  const toggleSession = useCallback(
    (index: number) => {
      const newCompleted = new Set(completedSessions);
      if (newCompleted.has(index)) {
        newCompleted.delete(index);
      } else {
        newCompleted.add(index);
      }
      setCompletedSessions(newCompleted);
      saveProgress(newCompleted);
    },
    [completedSessions]
  );

  const handleExpand = useCallback(
    (day: number) => {
      setExpandedDay(expandedDay === day ? null : day);
    },
    [expandedDay]
  );

  const progressPercent = (completedSessions.size / TOTAL_SESSIONS) * 100;
  const completedDays = dayGroups.filter((dg) =>
    dg.sessions.every((s) => completedSessions.has(s.index))
  ).length;

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const renderDayCard = useCallback(
    ({ item }: { item: DayGroup }) => (
      <DayCard
        dayGroup={item}
        completedSet={completedSessions}
        expandedDay={expandedDay}
        onExpand={handleExpand}
        onToggleSession={toggleSession}
      />
    ),
    [completedSessions, expandedDay, handleExpand, toggleSession]
  );

  const keyExtractor = useCallback((item: DayGroup) => String(item.day), []);

  const ListHeader = () => (
    <View>
      <View style={[styles.headerSection, { paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 16 }]}>
        <View style={styles.titleRow}>
          <MaterialCommunityIcons
            name="book-open-page-variant"
            size={28}
            color={Colors.neonGreen}
          />
          <Text style={styles.appTitle}>Qur'an Tracker</Text>
        </View>
        <Text style={styles.appSubtitle}>Complete the Quran in 60 days</Text>
      </View>

      <View style={styles.progressCard}>
        <LinearGradient
          colors={["#111820", "#0F1923"]}
          style={styles.progressGradient}
        >
          <View style={styles.progressTopRow}>
            <View style={styles.progressStatItem}>
              <Text style={styles.progressStatValue}>
                {completedSessions.size}
              </Text>
              <Text style={styles.progressStatLabel}>Sessions</Text>
            </View>
            <View style={styles.progressStatDivider} />
            <View style={styles.progressStatItem}>
              <Text style={styles.progressStatValue}>{completedDays}</Text>
              <Text style={styles.progressStatLabel}>Days</Text>
            </View>
            <View style={styles.progressStatDivider} />
            <View style={styles.progressStatItem}>
              <Text style={[styles.progressStatValue, { color: Colors.neonGreen }]}>
                {progressPercent.toFixed(1)}%
              </Text>
              <Text style={styles.progressStatLabel}>Complete</Text>
            </View>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBg}>
              <LinearGradient
                colors={[Colors.neonGreen, Colors.emerald]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.progressBarFill,
                  { width: `${Math.max(progressPercent, 1)}%` },
                ]}
              />
            </View>
          </View>
        </LinearGradient>
      </View>

      <Text style={styles.sectionTitle}>Reading Schedule</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <MaterialCommunityIcons
          name="book-open-page-variant"
          size={48}
          color={Colors.neonGreen}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={dayGroups}
        renderItem={renderDayCard}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: (Platform.OS === "web" ? webBottomInset : insets.bottom) + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 16,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  appTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  appSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  progressCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  progressGradient: {
    padding: 20,
  },
  progressTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  progressStatItem: {
    alignItems: "center",
    flex: 1,
  },
  progressStatValue: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  progressStatLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  progressStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.cardBorder,
  },
  progressBarContainer: {
    marginTop: 4,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.progressBg,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  dayCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: "hidden",
  },
  dayCardComplete: {
    borderColor: "#064E3B",
  },
  dayCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  dayLeftSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  dayNumberCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.progressBg,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumberCircleComplete: {
    backgroundColor: Colors.emerald,
  },
  dayNumberText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  dayInfo: {
    flex: 1,
  },
  dayTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  daySubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 1,
  },
  dayRightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  miniProgressBar: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.progressBg,
    overflow: "hidden",
  },
  miniProgressFill: {
    height: 4,
    borderRadius: 2,
  },
  sessionsContainer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 8,
  },
  sessionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.progressBg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "transparent",
  },
  sessionItemCompleted: {
    backgroundColor: "#0A2018",
    borderColor: "#064E3B",
  },
  sessionLeft: {
    flex: 1,
    gap: 4,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sessionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  sessionTitleCompleted: {
    color: Colors.emerald,
  },
  pagesBadge: {
    backgroundColor: "rgba(57, 255, 20, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pagesText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.neonGreen,
  },
  surahRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  surahText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    flex: 1,
  },
  checkButton: {
    padding: 4,
  },
  checkCircleFilled: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircleEmpty: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.cardBorder,
  },
});
