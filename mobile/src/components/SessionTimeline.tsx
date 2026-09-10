import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";
import { evaluateFrame, SEGMENT_COLORS, SegmentEvaluation, SegmentLevel, FrameMetricsLike } from "../lib/postureEvaluator";

interface Frame extends FrameMetricsLike {
  tSeconds: number;
}

interface Props {
  frames: Frame[];
  segmentKey: keyof SegmentEvaluation;
  title: string;
  bucketCount?: number;
}

const SEVERITY_RANK: Record<SegmentLevel, number> = { OK: 0, LEVE: 1, MODERADO: 2, ALTO: 3 };

export default function SessionTimeline({ frames, segmentKey, title, bucketCount = 40 }: Props) {
  if (frames.length < 2) return null;

  const startT = frames[0].tSeconds;
  const endT = frames[frames.length - 1].tSeconds;
  const duration = endT - startT || 1;
  const bucketSize = duration / bucketCount;

  const worstPerBucket: SegmentLevel[] = new Array(bucketCount).fill("OK");
  for (const frame of frames) {
    const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor((frame.tSeconds - startT) / bucketSize)));
    const level = evaluateFrame(frame)[segmentKey];
    if (SEVERITY_RANK[level] > SEVERITY_RANK[worstPerBucket[idx]]) worstPerBucket[idx] = level;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <View
        style={styles.strip}
        accessible
        accessibilityLabel={`${title}: línea de tiempo de severidad de ${startT.toFixed(0)} a ${endT.toFixed(0)} segundos`}
      >
        {worstPerBucket.map((level, i) => (
          <View key={i} style={[styles.segment, { backgroundColor: SEGMENT_COLORS[level] }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4, marginBottom: 16 },
  title: { color: colors.muted, fontSize: 11, marginBottom: 6 },
  strip: { flexDirection: "row", gap: 2, height: 20, borderRadius: 6, overflow: "hidden" },
  segment: { flex: 1 },
});
