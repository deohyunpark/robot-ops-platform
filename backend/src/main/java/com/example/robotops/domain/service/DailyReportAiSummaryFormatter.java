package com.example.robotops.domain.service;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class DailyReportAiSummaryFormatter {

    private static final Pattern BOLD = Pattern.compile("\\*\\*([^*]+)\\*\\*");
    private static final Pattern ITALIC = Pattern.compile("(?<!\\*)\\*([^*]+)\\*(?!\\*)");

    private DailyReportAiSummaryFormatter() {
    }

    static String toHtml(String markdown) {
        if (markdown == null || markdown.isBlank()) {
            return "";
        }

        String normalized = markdown
                .replace("\r\n", "\n")
                .replace('\r', '\n')
                .trim();

        StringBuilder html = new StringBuilder();
        html.append("<div class=\"summary-content\">");

        for (String rawLine : normalized.split("\n")) {
            String line = rawLine.trim();
            if (line.isEmpty()) {
                continue;
            }

            if (line.startsWith("### ")) {
                html.append("<h3>").append(inline(line.substring(4))).append("</h3>");
                continue;
            }
            if (line.startsWith("## ")) {
                html.append("<h2>").append(inline(line.substring(3))).append("</h2>");
                continue;
            }
            if (line.startsWith("# ")) {
                html.append("<h1>").append(inline(line.substring(2))).append("</h1>");
                continue;
            }
            if (line.matches("^[-*•]\\s+.+")) {
                html.append("<p class=\"bullet\">• ")
                        .append(inline(line.replaceFirst("^[-*•]\\s+", "")))
                        .append("</p>");
                continue;
            }
            if (line.matches("^\\d+[.)]\\s+.+")) {
                html.append("<p class=\"numbered\">")
                        .append(inline(line))
                        .append("</p>");
                continue;
            }

            html.append("<p>").append(inline(line)).append("</p>");
        }

        html.append("</div>");
        return html.toString();
    }

    private static String inline(String text) {
        String escaped = escapeHtml(text);
        escaped = applyPattern(BOLD, escaped, "<strong>", "</strong>");
        escaped = applyPattern(ITALIC, escaped, "<em>", "</em>");
        return escaped;
    }

    private static String applyPattern(
            Pattern pattern,
            String input,
            String openTag,
            String closeTag
    ) {
        Matcher matcher = pattern.matcher(input);
        StringBuffer buffer = new StringBuffer();
        while (matcher.find()) {
            String replacement = openTag + matcher.group(1) + closeTag;
            matcher.appendReplacement(buffer, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(buffer);
        return buffer.toString();
    }

    private static String escapeHtml(String text) {
        return text
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
