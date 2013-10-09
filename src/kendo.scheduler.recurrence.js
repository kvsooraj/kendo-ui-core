kendo_module({
    id: "scheduler.recurrence",
    name: "Recurrence",
    category: "web",
    depends: [ "dropdownlist", "datepicker", "numerictextbox" ],
    hidden: true
});

(function($, undefined) {
    var kendo = window.kendo,
        timezone = kendo.timezone,
        Class = kendo.Class,
        ui = kendo.ui,
        Widget = ui.Widget,
        DropDownList = ui.DropDownList,
        date = kendo.date,
        setTime = date.setTime,
        setDayOfWeek = date.setDayOfWeek,
        adjustDST = date.adjustDST,
        firstDayOfMonth = date.firstDayOfMonth,
        getMilliseconds = date.getMilliseconds,
        DAYS_IN_LEAPYEAR = [0,31,60,91,121,152,182,213,244,274,305,335,366],
        DAYS_IN_YEAR = [0,31,59,90,120,151,181,212,243,273,304,334,365],
        MONTHS = [31, 28, 30, 31, 30, 31, 30, 31, 30, 31, 30, 31],
        WEEK_DAYS = {
            0: "SU",
            1: "MO",
            2: "TU",
            3: "WE",
            4: "TH",
            5: "FR",
            6: "SA"
        },
        WEEK_DAYS_IDX = {
            "SU": 0,
            "MO": 1,
            "TU": 2,
            "WE": 3,
            "TH": 4,
            "FR": 5,
            "SA": 6
        },
        DATE_FORMATS = [
            "yyyy-MM-ddTHH:mm:ss.fffzzz",
            "yyyy-MM-ddTHH:mm:sszzz",
            "yyyy-MM-ddTHH:mm:ss",
            "yyyy-MM-ddTHH:mm",
            "yyyy-MM-ddTHH",
            "yyyy-MM-dd",
            "yyyyMMddTHHmmssfffzzz",
            "yyyyMMddTHHmmsszzz",
            "yyyyMMddTHHmmss",
            "yyyyMMddTHHmm",
            "yyyyMMddTHH",
            "yyyyMMdd"
        ],
        RULE_NAMES = ["months", "weeks", "yearDays", "monthDays", "weekDays", "hours", "minutes", "seconds"],
        RULE_NAMES_LENGTH = RULE_NAMES.length,
        limitation = {
            months: function(date, end, rule) {
                var monthRules = rule.months,
                    months = ruleValues(monthRules, date.getMonth() + 1),
                    changed = false;

                if (months !== null) {
                    if (months.length) {
                        date.setMonth(months[0] - 1, 1);
                    } else {
                        date.setFullYear(date.getFullYear() + 1, monthRules[0] - 1, 1);
                    }

                    changed = true;
                }

                return changed;
            },

            monthDays: function(date, end, rule) {
                var monthLength, month, days,
                    changed = false,
                    hours = date.getHours(),
                    normalize = function(monthDay) {
                        if (monthDay < 0) {
                            monthDay = monthLength + monthDay;
                        }
                        return monthDay;
                    };

                while (date <= end) {
                    month = date.getMonth();
                    monthLength = getMonthLength(date);
                    days = ruleValues(rule.monthDays, date.getDate(), normalize);

                    if (days === null) {
                        return changed;
                    }

                    changed = true;

                    if (days.length) {
                        date.setMonth(month, days.sort(numberSortPredicate)[0]);
                        adjustDST(date, hours);

                        if (month === date.getMonth()) {
                            break;
                        }
                    } else {
                        date.setMonth(month + 1, 1);
                    }
                }

                return changed;
            },

            yearDays: function(date, end, rule) {
                var year, yearDays,
                    changed = false,
                    hours = date.getHours(),
                    normalize = function(yearDay) {
                        if (yearDay < 0) {
                            yearDay = year + yearDay;
                        }
                        return yearDay;
                    };

                while (date < end) {
                    year = leapYear(date) ? 366 : 365;
                    yearDays = ruleValues(rule.yearDays, dayInYear(date), normalize);

                    if (yearDays === null) {
                        return changed;
                    }

                    changed = true;
                    year = date.getFullYear();

                    if (yearDays.length) {
                        date.setFullYear(year, 0, yearDays.sort(numberSortPredicate)[0]);
                        adjustDST(date, hours);
                        break;
                    } else {
                        date.setFullYear(year + 1, 0, 1);
                    }
                }

                return changed;
            },

            weeks: function(date, end, rule) {
                var weekStart = rule.weekStart,
                    year, weeks, day,
                    changed = false,
                    hours = date.getHours(),
                    normalize = function(week) {
                        if (week < 0) {
                            week = 53 + week;
                        }
                        return week;
                    };

                while (date < end) {
                    weeks = ruleValues(rule.weeks, weekInYear(date, weekStart), normalize);

                    if (weeks === null) {
                        return changed;
                    }

                    changed = true;
                    year = date.getFullYear();

                    if (weeks.length) {
                        day = (weeks.sort(numberSortPredicate)[0] * 7) - 1;

                        date.setFullYear(year, 0, day);
                        setDayOfWeek(date, weekStart, -1);

                        adjustDST(date, hours);
                        break;
                    } else {
                        date.setFullYear(year + 1, 0, 1);
                    }
                }

                return changed;
            },

            weekDays: function(date, end, rule) {
                var weekDays = rule.weekDays,
                    weekStart = rule.weekStart,
                    weekDayRules = ruleWeekValues(weekDays, date, weekStart),
                    interval = rule.interval,
                    hours = date.getHours(),
                    weekDayRule, day;

                if (weekDayRules === null) {
                    return false;
                }

                weekDayRule = weekDayRules[0];
                if (!weekDayRule) {
                    weekDayRule = weekDays[0];
                    setDayOfWeek(date, weekStart);

                    if (rule._weekDayFound && interval > 1) {
                        date.setDate(date.getDate() + ((interval - 1) * 7));
                        adjustDST(date, hours);
                    }
                }

                day = weekDayRule.day;
                rule._weekDayFound = true;

                if (weekDayRule.offset) {
                    while (date <= end && !isInWeek(date, weekDayRule, weekStart)) {
                        if (weekInMonth(date, weekStart) === numberOfWeeks(date, weekStart)) {
                            date.setMonth(date.getMonth() + 1, 1);
                            adjustDST(date, hours);
                        } else {
                            date.setDate(date.getDate() + 7);
                            adjustDST(date, hours);

                            setDayOfWeek(date, weekStart, -1);
                        }
                    }
                }

                if (date.getDay() !== day) {
                    setDayOfWeek(date, day);
                }

                return true;
            },

            hours: function(date, end, rule) {
                var hourRules = rule.hours,
                    startTime = rule._startTime,
                    startHours = startTime.getHours(),
                    hours = ruleValues(hourRules, startHours),
                    changed = false;

                if (hours !== null) {
                    changed = true;

                    date.setHours(startHours);
                    adjustDST(date, startHours);

                    if (hours.length) {
                        hours = hours[0];
                        date.setHours(hours);
                    } else {
                        hours = date.getHours();
                        date.setDate(date.getDate() + 1);
                        adjustDST(date, hours);

                        hours = hourRules[0];
                        date.setHours(hours);
                        adjustDST(date, hours);
                    }

                    if (rule.minutes) {
                        date.setMinutes(0);
                    }

                    startTime.setHours(hours, date.getMinutes());
                }

                return changed;
            },

            minutes: function(date, end, rule) {
                var minuteRules = rule.minutes,
                    currentMinutes = date.getMinutes(),
                    minutes = ruleValues(minuteRules, currentMinutes),
                    hours = rule._startTime.getHours(),
                    changed = false;

                if (minutes !== null) {
                    changed = true;

                    if (minutes.length) {
                        minutes = minutes[0];
                    } else {
                        hours += 1;
                        minutes = minuteRules[0];
                    }

                    if (rule.seconds) {
                        date.setSeconds(0);
                    }

                    date.setHours(hours, minutes);

                    hours = hours % 24;
                    adjustDST(date, hours);
                    rule._startTime.setHours(hours, minutes, date.getSeconds());
                }

                return changed;
            },

            seconds: function(date, end, rule) {
                var secondRules = rule.seconds,
                    hours = rule._startTime.getHours(),
                    seconds = ruleValues(secondRules, date.getSeconds()),
                    minutes = date.getMinutes(),
                    changed = false;

                if (seconds !== null) {
                    changed = true;

                    if (seconds.length) {
                        date.setSeconds(seconds[0]);
                    } else {
                        minutes += 1;
                        date.setMinutes(minutes, secondRules[0]);

                        if (minutes > 59) {
                            minutes = minutes % 60;
                            hours = (hours + 1) % 24;
                        }
                    }

                    rule._startTime.setHours(hours, minutes, date.getSeconds());
                }

                return changed;
            }
        },
        BaseFrequency = Class.extend({
            next: function(date, rule) {
                var startTime = rule._startTime,
                    day = startTime.getDate(),
                    minutes, seconds;

                if (rule.seconds) {
                    seconds = date.getSeconds() + 1;

                    date.setSeconds(seconds);
                    startTime.setSeconds(seconds);
                    startTime.setDate(day);

                } else if (rule.minutes) {
                    minutes = date.getMinutes() + 1;

                    date.setMinutes(minutes);
                    startTime.setMinutes(minutes);
                    startTime.setDate(day);
                } else {
                    return false;
                }

                return true;
            },

            normalize: function(options) {
                var rule = options.rule;

                if (options.idx === 4 && rule.hours) {
                    rule._startTime.setHours(0);
                    this._hour(options.date, rule);
                }
            },

            limit: function(date, end, rule) {
                var ruleName, firstRule, modified,
                    idx, day;

                while (date <= end) {
                    modified = firstRule = undefined;
                    day = date.getDate();

                    for (idx = 0; idx < RULE_NAMES_LENGTH; idx++) {
                        ruleName = RULE_NAMES[idx];

                        if (rule[ruleName]) {
                            modified = limitation[ruleName](date, end, rule);
                            if (firstRule !== undefined && modified) {
                                break;
                            } else {
                                firstRule = modified;
                            }
                        }

                        if (modified) {
                            this.normalize({ date: date, rule: rule, day: day, idx: idx });
                        }
                    }

                    if (idx === RULE_NAMES_LENGTH) {
                        break;
                    }
                }
            },

            _hour: function(date, rule, interval) {
                var startTime = rule._startTime,
                    hours = startTime.getHours();

                if (interval) {
                    hours += interval;
                }

                date.setHours(hours);

                hours = hours % 24;
                startTime.setHours(hours);
                adjustDST(date, hours);
            },

            _date: function(date, rule, interval) {
                var hours = date.getHours();

                date.setDate(date.getDate() + interval);
                if (!adjustDST(date, hours)) {
                    this._hour(date, rule);
                }
            }
        }),
        HourlyFrequency = BaseFrequency.extend({
            next: function(date, rule) {
                if (!BaseFrequency.fn.next(date, rule)) {
                    this._hour(date, rule, rule.interval);
                }
            },

            normalize: function(options) {
                var rule = options.rule;

                if (options.idx === 4) {
                    rule._startTime.setHours(0);
                    this._hour(options.date, rule);
                }
            }
        }),
        DailyFrequency = BaseFrequency.extend({
            next: function(date, rule) {
                if (!BaseFrequency.fn.next(date, rule)) {
                    if (rule.hours) {
                        this._hour(date, rule, 1);
                    } else {
                        this._date(date, rule, rule.interval);
                    }
                }
            }
        }),
        WeeklyFrequency = BaseFrequency.extend({
            next: function(date, rule) {
                if (!BaseFrequency.fn.next(date, rule)) {
                    if (rule.hours) {
                        this._hour(date, rule, 1);
                    } else {
                        this._date(date, rule, 1);
                    }
                }
            },
            setup: function(rule, eventStartDate) {
                if (!rule.weekDays) {
                    rule.weekDays = [{
                        day: eventStartDate.getDay(),
                        offset: 0
                    }];
                }
            }
        }),
        MonthlyFrequency = BaseFrequency.extend({
            next: function(date, rule) {
                var day, hours;
                if (!BaseFrequency.fn.next(date, rule)) {
                    if (rule.hours) {
                        this._hour(date, rule, 1);
                    } else if (rule.monthDays || rule.weekDays || rule.yearDays || rule.weeks) {
                        this._date(date, rule, 1);
                    } else {
                        day = date.getDate();
                        hours = date.getHours();

                        date.setMonth(date.getMonth() + 1);
                        adjustDST(date, hours);

                        while(date.getDate() !== day) {
                            date.setDate(day);
                            adjustDST(date, hours);
                        }

                        this._hour(date, rule);
                    }
                }
            },
            normalize: function(options) {
                var rule = options.rule,
                    date = options.date,
                    hours = date.getHours();

                if (options.idx === 0 && !rule.monthDays && !rule.weekDays) {
                    date.setDate(options.day);
                    adjustDST(date, hours);
                } else {
                    BaseFrequency.fn.normalize(options);
                }
            },
            setup: function(rule, eventStartDate, date) {
                if (!rule.monthDays && !rule.weekDays) {
                    date.setDate(eventStartDate.getDate());
                }
            }
        }),
        YearlyFrequency = MonthlyFrequency.extend({
            next: function(date, rule) {
                var day,
                    hours = date.getHours();

                if (!BaseFrequency.fn.next(date, rule)) {
                    if (rule.hours) {
                        this._hour(date, rule, 1);
                    } else if (rule.monthDays || rule.weekDays || rule.yearDays || rule.weeks) {
                        this._date(date, rule, 1);
                    } else if (rule.months) {
                        day = date.getDate();

                        date.setMonth(date.getMonth() + 1);
                        adjustDST(date, hours);

                        while(date.getDate() !== day) {
                            date.setDate(day);
                            adjustDST(date, hours);
                        }

                        this._hour(date, rule);
                    } else {
                        date.setFullYear(date.getFullYear() + 1);
                        adjustDST(date, hours);

                        this._hour(date, rule);
                    }
                }
            },
            setup: function() {}
        }),
        frequencies = {
            "hourly" : new HourlyFrequency(),
            "daily" : new DailyFrequency(),
            "weekly" : new WeeklyFrequency(),
            "monthly" : new MonthlyFrequency(),
            "yearly" : new YearlyFrequency()
        },
        CLICK = "click";

    function dayInYear(date) {
        var month = date.getMonth(),
        days = leapYear(date) ? DAYS_IN_LEAPYEAR[month] : DAYS_IN_YEAR[month];

        return days + date.getDate();
    }

    function weekInYear(date, weekStart){
        var year, days;

        date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        adjustDST(date, 0);

        year = date.getFullYear();

        if (weekStart !== undefined) {
            setDayOfWeek(date, weekStart, -1);
            date.setDate(date.getDate() + 4);
        } else {
            date.setDate(date.getDate() + (4 - (date.getDay() || 7)));
        }

        adjustDST(date, 0);
        days = Math.floor((date.getTime() - new Date(year, 0, 1, -6)) / 86400000);

        return 1 + Math.floor(days / 7);
    }

    function weekInMonth(date, weekStart) {
        var firstWeekDay = firstDayOfMonth(date).getDay(),
            firstWeekLength = Math.abs(7 - (firstWeekDay + 7 - (weekStart || 7))) || 7;

        return Math.ceil((date.getDate() - firstWeekLength) / 7) + 1;
    }

    function normalizeOffset(date, offset, weekStart) {
        if (offset < 0) {
            offset = numberOfWeeks(date, weekStart) + (offset + 1);
        }
        return offset;
    }

    function numberOfWeeks(date, weekStart) {
        return weekInMonth(new Date(date.getFullYear(), date.getMonth() + 1, 0), weekStart);
    }

    function isInWeek(date, weekDayRule, weekStart) {
        var offset = weekDayRule.offset,
            weekNumber = weekInMonth(date, weekStart);

        if (!allowFirstWeek(date, weekDayRule, weekStart)) {
            weekNumber -= 1;
        }

        return weekNumber === normalizeOffset(date, offset, weekStart);
    }

    function allowFirstWeek(date, weekDayRule, weekStart) {
        var day = weekDayRule.day,
            offset = weekDayRule.offset,
            firstDay, allow;

        if (!offset) {
            return true;
        }

        firstDay = firstDayOfMonth(date).getDay();
        if (firstDay < weekStart) {
            firstDay += weekStart;
        }

        if (day < weekStart) {
            day += weekStart;
        }

        allow = day >= firstDay;
        if (!allow && offset < 0 && normalizeOffset(date, offset, weekStart) !== 1) {
            allow = true;
        }

        return allow;
    }

    function ruleWeekValues(weekDays, date, weekStart) {
        var currentDay = date.getDay(),
            length = weekDays.length,
            weekDay, day, offset,
            weekNumber,
            result = [],
            idx = 0;

        if (currentDay < weekStart) {
            currentDay += 7;
        }

        for (;idx < length; idx++) {
            weekDay = weekDays[idx];
            offset = weekDay.offset;
            day = weekDay.day;

            if (day < weekStart) {
                day += 7;
            }

            weekNumber = weekInMonth(date, weekStart);
            if (!allowFirstWeek(date, weekDay, weekStart)) {
                weekNumber -= 1;
            }

            offset = offset ? normalizeOffset(date, offset, weekStart) : weekNumber;

            if (weekNumber < offset) {
                result.push(weekDay);
            } else if (weekNumber === offset) {
                if (currentDay < day) {
                    result.push(weekDay);
                } else if (currentDay === day) {
                    return null;
                }
            }
        }

        return result;
    }

    function ruleValues(rules, value, normalize) {
        var idx = 0,
            length = rules.length,
            availableRules = [],
            ruleValue;

        for (; idx < length; idx++) {
            ruleValue = rules[idx];

            if (normalize) {
                ruleValue = normalize(ruleValue);
            }

            if (value === ruleValue) {
                return null;
            }  else if (value < ruleValue) {
                availableRules.push(ruleValue);
            }
        }

        return availableRules;
    }

    function eventsByPosition(events, positions) {
        var result = [],
            length = positions.length,
            idx = 0, event;

        for (;idx < length; idx++) {
            event = events[positions[idx] - 1];

            if (event) {
                result.push(event);
            }
        }

        return result;
    }

    function parseArray(list, range) {
        var idx = 0,
            length = list.length,
            value;

        for (; idx < length; idx++) {
            value = parseInt(list[idx], 10);
            if (isNaN(value) || value < range.start || value > range.end || (value === 0 && range.start < 0)) {
                return null;
            }

            list[idx] = value;
        }

        return list.sort(numberSortPredicate);
    }

    function parseWeekDayList(list) {
        var idx = 0, length = list.length,
            value, valueLength, day;

        for (; idx < length; idx++) {
            value = list[idx];
            valueLength = value.length;
            day = value.substring(valueLength - 2).toUpperCase();

            day = WEEK_DAYS_IDX[day];
            if (day === undefined) {
                return null;
            }

            list[idx] = {
                offset: parseInt(value.substring(0, valueLength - 2), 10) || 0,
                day: day
            };
        }
        return list;
    }

    function serializeWeekDayList(list) {
        var idx = 0, length = list.length,
            value, valueString, result = [];

        for (; idx < length; idx++) {
            value = list[idx];
            if (typeof value === "string") {
                valueString = value;
            } else {
                valueString = "" + WEEK_DAYS[value.day];

                if (value.offset) {
                    valueString = value.offset + valueString;
                }
            }

            result.push(valueString);
        }
        return result.toString();
    }

    function getMonthLength(date) {
        var month = date.getMonth();

        if (month === 1) {
            if (new Date(date.getFullYear(), 1, 29).getMonth() === 1) {
                return 29;
            }
            return 28;
        }
        return MONTHS[month];
    }

    function leapYear(year) {
        year = year.getFullYear();
        return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
    }

    function numberSortPredicate(a, b) {
        return a - b;
    }

    function parseExceptions(exceptions, zone) {
        var idx = 0, length, date,
            dates = [];

        if (exceptions) {
            exceptions = exceptions.split(";");
            length = exceptions.length;

            for (; idx < length; idx++) {
                date = parseUTCDate(exceptions[idx], zone);

                if (date) {
                    dates.push(date);
                }
            }
        }

        return dates;
    }

    function isException(exceptions, date, zone) {
        var dates = $.isArray(exceptions) ? exceptions : parseExceptions(exceptions, zone),
            dateTime = date.getTime() - date.getMilliseconds(),
            idx = 0, length = dates.length;

        for (; idx < length; idx++) {
            if (dates[idx].getTime() === dateTime) {
                return true;
            }
        }

        return false;
    }

    function expand(event, start, end, zone) {
        var rule = parseRule(event.recurrenceRule),
            startTime, endTime, endDate,
            hours, minutes, seconds,
            durationMS, startPeriod,
            ruleStart, ruleEnd,
            useEventStart, freqName,
            exceptionDates,
            eventStartTime,
            eventStartMS,
            eventStart,
            count, freq,
            current = 1,
            events = [];

        if (!rule) {
            return [event];
        }

        ruleStart = rule.start;
        ruleEnd = rule.end;

        if (ruleStart || ruleEnd) {
            event = event.clone({
                start: ruleStart ? new Date(ruleStart.value) : undefined,
                end: ruleEnd ? new Date(ruleEnd.value) : undefined
            });
        }

        eventStart = event.start;
        eventStartMS = eventStart.getTime();
        eventStartTime = getMilliseconds(eventStart);

        exceptionDates = parseExceptions(event.recurrenceException, zone);
        startPeriod = start = new Date(start);
        end = new Date(end);

        freqName = rule.freq;
        freq = frequencies[freqName];
        count = rule.count;

        if (rule.until && rule.until < end) {
            end = new Date(rule.until);
        }

        useEventStart = freqName === "yearly" || freqName === "monthly" || freqName === "weekly";

        if (start < eventStartMS || count || rule.interval > 1 || useEventStart) {
            start = new Date(eventStartMS);
        } else {
            hours = start.getHours();
            minutes = start.getMinutes();
            seconds = start.getSeconds();

            if (!rule.hours) {
                hours = eventStart.getHours();
            }

            if (!rule.minutes) {
                minutes = eventStart.getMinutes();
            }

            if (!rule.seconds) {
                seconds = eventStart.getSeconds();
            }

            start.setHours(hours, minutes, seconds, eventStart.getMilliseconds());
        }

        durationMS = event.duration();
        rule._startTime = startTime = kendo.date.toInvariantTime(start);

        if (freq.setup) {
            freq.setup(rule, eventStart, start);
        }

        freq.limit(start, end, rule);

        while (start <= end) {
            if (start >= startPeriod && !isException(exceptionDates, start, zone)) {
                endDate = new Date(start);
                setTime(endDate, durationMS);

                endTime = new Date(rule._startTime);
                setTime(endTime, durationMS);

                if (eventStartMS !== start.getTime() || eventStartTime !== getMilliseconds(startTime)) {
                    events.push(event.toOccurrence({
                        start: new Date(start),
                        startTime: new Date(startTime),
                        end: endDate,
                        endTime: endTime
                    }));
                } else {
                    event.startTime = startTime;
                    event.endTime = endTime;
                    events.push(event);
                }
            }

            if (count && count === current) {
                break;
            }

            current++;
            freq.next(start, rule);
            freq.limit(start, end, rule);
        }

        if (rule.setPositions) {
            events = eventsByPosition(events, rule.setPositions);
        }

        return events;
    }

    function parseUTCDate(value, zone) {
        value = kendo.parseDate(value, DATE_FORMATS); //Parse UTC to local time

        if (value && zone) {
            value = timezone.convert(value, value.getTimezoneOffset(), zone);
        }

        return value;
    }

    function parseDateRule(dateRule, zone) {
        var pairs = dateRule.split(";");
        var pair;
        var property;
        var value;
        var tzid;

        for (var idx = 0, length = pairs.length; idx < length; idx++) {
            pair = pairs[idx].split(":");
            property = pair[0];
            value = pair[1];

            if (property.indexOf("TZID") !== -1) {
                tzid = property.substring(property.indexOf("TZID")).split("=")[1];
            }

            if (value) {
                value = parseUTCDate(value, tzid || zone);
            }
        }

        if (value) {
            return {
                value: value,
                tzid: tzid
            };
        }
    }

    function parseRule(recur, zone) {
        var instance = {},
            idx = 0, length,
            splits, value,
            property,
            weekStart,
            weekDays,
            rule, part, parts,
            predicate = function(a, b) {
                var day1 = a.day,
                    day2 = b.day;

                if (day1 < weekStart) {
                   day1 += weekStart;
                }

                if (day2 < weekStart) {
                    day2 += weekStart;
                }

                return day1 - day2;
            };

        if (!recur) {
            return null;
        }

        parts = recur.split("\n");

        if (!parts[1] && (recur.indexOf("DTSTART") !== -1 || recur.indexOf("DTEND") !== -1)) {
            parts = recur.split(" ");
        }

        for (idx = 0, length = parts.length; idx < length; idx++) {
            part = parts[idx];

            if (part.indexOf("DTSTART") !== -1) {
                instance.start = parseDateRule(part, zone);
            } else if (part.indexOf("DTEND") !== -1) {
                instance.end = parseDateRule(part, zone);
            } else if (part.indexOf("RRULE") !== -1) {
                rule = part.substring(6);
            } else {
                rule = part;
            }
        }

        rule = rule.split(";");

        for (idx = 0, length = rule.length; idx < length; idx++) {
            property = rule[idx];
            splits = property.split("=");
            value = $.trim(splits[1]).split(",");

            switch ($.trim(splits[0]).toUpperCase()) {
                case "FREQ":
                    instance.freq = value[0].toLowerCase();
                    break;
                case "UNTIL":
                    instance.until = parseUTCDate(value[0], zone);
                    break;
                case "COUNT":
                    instance.count = parseInt(value[0], 10);
                    break;
                case "INTERVAL":
                    instance.interval = parseInt(value[0], 10);
                    break;
                case "BYSECOND":
                    instance.seconds = parseArray(value, { start: 0, end: 60 });
                    break;
                case "BYMINUTE":
                    instance.minutes = parseArray(value, { start: 0, end: 59 });
                    break;
                case "BYHOUR":
                    instance.hours = parseArray(value, { start: 0, end: 23 });
                    break;
                case "BYMONTHDAY":
                    instance.monthDays = parseArray(value, { start: -31, end: 31 });
                    break;
                case "BYYEARDAY":
                    instance.yearDays = parseArray(value, { start: -366, end: 366 });
                    break;
                case "BYMONTH":
                    instance.months = parseArray(value, { start: 1, end: 12 });
                    break;
                case "BYDAY":
                    instance.weekDays = weekDays = parseWeekDayList(value);
                    break;
                case "BYSETPOS":
                    //TODO: rename to positions
                    instance.setPositions = parseArray(value, { start: 1, end: 366 });
                    break;
                case "BYWEEKNO":
                    instance.weeks = parseArray(value, { start: -53, end: 53 });
                    break;
                case "WKST":
                    instance.weekStart = weekStart = WEEK_DAYS_IDX[value[0]];
                    break;
            }

            if (instance.freq === undefined || (instance.count !== undefined && instance.until)) {
                return null;
            }

            if (!instance.interval) {
                instance.interval = 1;
            }

            if (weekStart === undefined) {
                //TODO: According ISO starndard the default day is MO, not the one defined by the current culture
                instance.weekStart = weekStart = kendo.culture().calendar.firstDay;
            }

            if (weekDays) {
                instance.weekDays = weekDays.sort(predicate);
            }
        }

        return instance;
    }

    function serializeDateRule(dateRule, zone) {
        var value = dateRule.value;
        var tzid = dateRule.tzid || "";

        value = timezone.convert(value, tzid || zone || value.getTimezoneOffset(), "Etc/UTC");

        if (tzid) {
            tzid = ";TZID=" + tzid;
        }

        return tzid + ":" + kendo.toString(value, "yyyyMMddTHHmmssZ") + " ";
    }

    function serialize(rule, zone) {
        var weekStart = rule.weekStart,
            ruleString = "FREQ=" + rule.freq.toUpperCase(),
            until = rule.until,
            start = rule.start || "",
            end = rule.end || "";

        if (rule.interval > 1) {
            ruleString += ";INTERVAL=" + rule.interval;
        }

        if (rule.count) {
            ruleString += ";COUNT=" + rule.count;
        }

        if (until) {
            until = timezone.convert(until, zone || until.getTimezoneOffset(), "Etc/UTC");
            ruleString += ";UNTIL=" + kendo.toString(until, "yyyyMMddTHHmmssZ");
        }

        if (rule.months) {
            ruleString += ";BYMONTH=" + rule.months;
        }

        if (rule.weeks) {
            ruleString += ";BYWEEKNO=" + rule.weeks;
        }

        if (rule.yearDays) {
            ruleString += ";BYYEARDAY=" + rule.yearDays;
        }

        if (rule.monthDays) {
            ruleString += ";BYMONTHDAY=" + rule.monthDays;
        }

        if (rule.weekDays) {
            ruleString += ";BYDAY=" + serializeWeekDayList(rule.weekDays);
        }

        if (rule.hours) {
            ruleString += ";BYHOUR=" + rule.hours;
        }

        if (rule.minutes) {
            ruleString += ";BYMINUTE=" + rule.minutes;
        }

        if (rule.seconds) {
            ruleString += ";BYSECOND=" + rule.seconds;
        }

        if (rule.setPositions) {
            ruleString += ";BYSETPOS=" + rule.setPositions;
        }

        if (weekStart !== undefined) {
            ruleString += ";WKST=" + WEEK_DAYS[weekStart];
        }

        if (start) {
            start = "DTSTART" + serializeDateRule(start, zone);
        }

        if (end) {
            end = "DTEND" + serializeDateRule(end, zone);
        }

        if (start || end) {
            ruleString = start + end + "RRULE:" + ruleString;
        }

        return ruleString;
    }

    kendo.recurrence = {
        rule: {
            parse: parseRule,
            serialize: serialize
        },
        expand: expand,
        dayInYear: dayInYear,
        weekInYear: weekInYear,
        weekInMonth: weekInMonth,
        numberOfWeeks: numberOfWeeks,
        isException: isException
    };

    var weekDayCheckBoxes = function(firstDay) {
        var shortNames = kendo.culture().calendar.days.namesShort,
            length = shortNames.length,
            result = "",
            idx = 0,
            values = [];

        for (; idx < length; idx++) {
            values.push(idx);
        }

        shortNames = shortNames.slice(firstDay).concat(shortNames.slice(0, firstDay));
        values = values.slice(firstDay).concat(values.slice(0, firstDay));

        for (idx = 0; idx < length; idx++) {
            result += '<label><input class="k-recur-weekday-checkbox" type="checkbox" value="' + values[idx] + '" /> ' + shortNames[idx] + "</label>";
        }

        return result;
    };

    var RECURRENCEVIEWTEMPLATE = kendo.template(
       '# if (frequency !== "never") { #' +
           '<div class="k-edit-label"><label>#:messages.repeatEvery#</label></div>' +
           '<div class="k-edit-field"><input class="k-recur-interval"/>#:messages.interval#</div>' +
       '# } #' +
       '# if (frequency === "weekly") { #' +
           '<div class="k-edit-label"><label>#:messages.repeatOn#</label></div>' +
           '<div class="k-edit-field">#=weekDayCheckBoxes(firstWeekDay)#</div>' +
       '# } else if (frequency === "monthly") { #' +
           '<div class="k-edit-label"><label>#:messages.repeatOn#</label></div>' +
           '<div class="k-edit-field">' +
               '<ul class="k-reset">' +
                   '<li>' +
                       '<label><input class="k-recur-month-radio" type="radio" name="month" value="monthday" />#:messages.day#</label>' +
                       '<input class="k-recur-monthday" />' +
                   '</li>' +
                   '<li>' +
                        '<input class="k-recur-month-radio" type="radio" name="month" value="weekday" />' +
                        '<input class="k-recur-weekday-offset" /><input class="k-recur-weekday" />' +
                   '</li>' +
               '</ul>' +
           '</div>' +
       '# } else if (frequency === "yearly") { #' +
           '<div class="k-edit-label"><label>#:messages.repeatOn#</label></div>' +
           '<div class="k-edit-field">' +
               '<ul class="k-reset">' +
                   '<li>' +
                       '<input class="k-recur-year-radio" type="radio" name="year" value="monthday" />' +
                       '<input class="k-recur-month" /><input class="k-recur-monthday" />' +
                   '</li>' +
                   '<li>' +
                       '<input class="k-recur-year-radio" type="radio" name="year" value="weekday" />' +
                       '<input class="k-recur-weekday-offset" /><input class="k-recur-weekday" />#:messages.of#<input class="k-recur-month" />' +
                   '</li>' +
               '</ul>' +
           '</div>' +
       '# } #' +
       '# if (frequency !== "never") { #' +
           '<div class="k-edit-label"><label>#:end.label#</label></div>' +
           '<div class="k-edit-field">' +
               '<ul class="k-reset">' +
                   '<li>' +
                       '<label><input class="k-recur-end-never" type="radio" name="end" value="never" />#:end.never#</label>' +
                   '</li>' +
                   '<li>' +
                       '<label><input class="k-recur-end-count" type="radio" name="end" value="count" />#:end.after#</label>' +
                       '<input class="k-recur-count" />#:end.occurrence#' +
                   '</li>' +
                   '<li>' +
                       '<label><input class="k-recur-end-until" type="radio" name="end" value="until" />#:end.on#</label>' +
                       '<input class="k-recur-until" />' +
                   '</li>' +
               '</ul>' +
           '</div>' +
       '# } #'
    );

    var BaseRecurrenceEditor = Widget.extend({
        init: function(element, options) {
            var that = this,
                start;

            Widget.fn.init.call(that, element, options);

            that.wrapper = that.element;

            options = that.options;
            options.start = start = options.start || date.today();

            if (typeof start === "string") {
                options.start = kendo.parseDate(start, "yyyyMMddTHHmmss");
            }

            if (options.firstWeekDay === null) {
                options.firstWeekDay = kendo.culture().calendar.firstDay;
            }

            that._namespace = "." + options.name;
        },

        options: {
            value: "",
            start: "",
            timezone: "",
            spinners: true,
            firstWeekDay: null,
            frequencies: [
                "never",
                "daily",
                "weekly",
                "monthly",
                "yearly"
            ],
            messages: {
                frequencies: {
                    never: "Never",
                    daily: "Daily",
                    weekly: "Weekly",
                    monthly: "Monthly",
                    yearly: "Yearly"
                },
                daily: {
                    repeatEvery: "Repeat every: ",
                    interval: " day(s)"
                },
                weekly: {
                    interval: " week(s)",
                    repeatEvery: "Repeat every: ",
                    repeatOn: "Repeat on: "
                },
                monthly: {
                    repeatEvery: "Repeat every: ",
                    repeatOn: "Repeat on: ",
                    interval: " month(s)",
                    day: "Day "
                },
                yearly: {
                    repeatEvery: "Repeat every: ",
                    repeatOn: "Repeat on: ",
                    interval: " year(s)",
                    of: " of "
                },
                end: {
                    label: "End:",
                    never: "Never",
                    after: "After ",
                    occurrence: " occurrence(s)",
                    on: "On "
                },
                offsetPositions: {
                    first: "first",
                    second: "second",
                    third: "third",
                    fourth: "fourth",
                    last: "last"
                }
            }
        },

        events: ["change"],

        _initInterval: function() {
            var that = this;
            var rule = that._value;

            that._container
                .find(".k-recur-interval")
                .kendoNumericTextBox({
                    spinners: that.options.spinners,
                    value: rule.interval || 1,
                    decimals: 0,
                    format: "#",
                    min: 1,
                    change: function() {
                        rule.interval = this.value();
                        that.trigger("change");
                    }
                });
        },

        _initWeekDay: function() {
            var that = this;
            var offsetMessage = that.options.messages.offsetPositions;

            var offsetInput = that._container.find(".k-recur-weekday-offset");
            var weekDayInput = that._container.find(".k-recur-weekday");

            var rule = that._value;
            var weekDays = rule.weekDays;

            var change = function() {
                rule.weekDays = [{
                    offset: Number(that._weekDayOffset.value()),
                    day: Number(that._weekDay.value())
                }];
                that.trigger("change");
            };

            if (weekDayInput[0]) {
                that._weekDayOffset = new DropDownList(offsetInput, {
                    change: change,
                    dataTextField: "text",
                    dataValueField: "value",
                    dataSource: [
                        { text: offsetMessage.first, value: "1" },
                        { text: offsetMessage.second, value: "2" },
                        { text: offsetMessage.third, value: "3" },
                        { text: offsetMessage.fourth, value: "4" },
                        { text: offsetMessage.last, value: "-1" }
                    ]
                });

                that._weekDay = new DropDownList(weekDayInput, {
                    change: change,
                    dataTextField: "text",
                    dataValueField: "value",
                    dataSource: $.map(kendo.culture().calendar.days.names, function(dayName, idx) {
                        return {
                            text: dayName,
                            value: idx
                        };
                    })
                });

                if (weekDays) {
                    weekDays = weekDays[0];

                    that._weekDayOffset.value(weekDays.offset || "");
                    that._weekDay.value(weekDays.day);
                }
            }
        },

        _initWeekDays: function() {
            var that = this;
            var rule = that._value;
            var weekDays = that._container.find(".k-recur-weekday-checkbox");

            if (weekDays[0]) {
                weekDays.on(CLICK + that._namespace, function() {
                    rule.weekDays = $.map(weekDays.filter(":checked"), function(checkbox) {
                        return {
                            day: Number(checkbox.value),
                            offset: 0
                        };
                    });

                    that.trigger("change");
                });

                if (rule.weekDays) {
                    var idx, weekDay;
                    var i = 0, l = weekDays.length;
                    var length = rule.weekDays.length;

                    for (; i < l; i++) {
                        weekDay = weekDays[i];
                        for (idx = 0; idx < length; idx ++) {
                            if (weekDay.value == rule.weekDays[idx].day) {
                                weekDay.checked = true;
                            }
                        }
                    }
                }
            }
        },

        _initMonthDay: function() {
            var that = this;
            var rule = that._value;
            var monthDayInput = that._container.find(".k-recur-monthday");

            if (monthDayInput[0]) {
                that._initMonthDay = new kendo.ui.NumericTextBox(monthDayInput, {
                    spinners: that.options.spinners,
                    min: 1,
                    max: 31,
                    decimals: 0,
                    format: "#",
                    value: rule.monthDays ? rule.monthDays[0] : that.options.start.getDate(),
                    change: function() {
                        var value = this.value();

                        rule.monthDays = value ? [value] : value;
                        that.trigger("change");
                    }
                });
            }
        },

        _initCount: function() {
            var that = this,
                input = that._container.find(".k-recur-count"),
                rule = that._value;

            that._count = input.kendoNumericTextBox({
                spinners: that.options.spinners,
                value: rule.count || 1,
                decimals: 0,
                format: "#",
                min: 1,
                change: function() {
                    rule.count = this.value();
                    that.trigger("change");
                }
            }).data("kendoNumericTextBox");
        },

        _initUntil: function() {
            var that = this,
                input = that._container.find(".k-recur-until"),
                start = that.options.start,
                rule = that._value,
                until = rule.until;

            that._until = input.kendoDatePicker({
                min: until && until < start ? until : start,
                value: until || start,
                change: function() {
                    rule.until = this.value();
                    that.trigger("change");
                }
            }).data("kendoDatePicker");
        },
    });

    var RecurrenceEditor = BaseRecurrenceEditor.extend({
        init: function(element, options) {
            var that = this,
                start;

            BaseRecurrenceEditor.fn.init.call(that, element, options);

            that._initFrequency();

            that._initContainer();

            that.value(that.options.value);
        },

        options: {
            name: "RecurrenceEditor",
            spinners: true,
            frequencies: ["never", "daily", "weekly", "monthly", "yearly"],
            firstWeekDay: null,
            timezone: "",
            start: "",
            value: "",
            messages: {
                frequencies: {
                    never: "Test",
                    daily: "Test",
                    weekly: "Test",
                    monthly: "Test",
                    yearly: "Test"
                }
            }
        },

        events: [ "change" ],

        destroy: function() {
            var that = this;

            that._frequency.destroy();
            that._container.find("input[type=radio],input[type=checkbox]").off(CLICK + that._namespace);

            kendo.destroy(that._container);

            Widget.fn.destroy.call(that);
        },

        value: function(value) {
            var that = this,
                timezone = that.options.timezone;

            if (value === undefined) {
                if (!that._value.freq) {
                    return "";
                }

                return serialize(that._value, timezone);
            }

            that._value = parseRule(value, timezone) || {};

            that._frequency.value(that._value.freq || "");
            that._initView(that._frequency.value());
        },

        //TODO: refactor
        _initView: function(frequency) {
            var that = this;
            var rule = that._value;
            var options = that.options;

            var data = {
                 frequency: frequency || "never",
                 weekDayCheckBoxes: weekDayCheckBoxes,
                 firstWeekDay: options.firstWeekDay,
                 messages: options.messages[frequency],
                 end: options.messages.end
            };

            that._container.html(RECURRENCEVIEWTEMPLATE(data));

            if (!frequency) {
                that._value = {};
                return;
            }

            rule.freq = frequency;

            that._initInterval();

            if (frequency === "weekly") {
                if (!rule.weekDays) {
                    rule.weekDays = [{
                        day: options.start.getDay(),
                        offset: 0
                    }];
                }
                that._initWeekDays();
            } else if (frequency === "monthly") {
                that._initMonthDay();
                that._initWeekDay();
                that._setMonthRule();
            } else if (frequency === "yearly") {
                that._initMonth();
                that._initMonthDay();
                that._initWeekDay();
                that._setYearRule();
            }

            that._initCount();
            that._initUntil();
            that._setEndRule();
        },

        _initMonth: function() {
            var that = this;
            var rule = that._value;
            var month = rule.months || [that.options.start.getMonth() + 1];
            var monthInputs = that._container.find(".k-recur-month");

            var change = function() {
                rule.months = [Number(this.value())];
                that.trigger("change");
            };

            var monthNames;

            if (monthInputs[0]) {
                monthNames = $.map(kendo.culture().calendar.months.names, function(monthName, idx) {
                    return {
                        text: monthName,
                        value: idx + 1
                    };
                });

                that._month1 = new DropDownList(monthInputs[0], {
                    change: change,
                    dataTextField: "text",
                    dataValueField: "value",
                    dataSource: monthNames
                });

                that._month2 = new DropDownList(monthInputs[1], {
                    change: change,
                    dataTextField: "text",
                    dataValueField: "value",
                    dataSource: monthNames
                });

                if (month) {
                    month = month[0];
                    that._month1.value(month);
                    that._month2.value(month);
                }
            }

        },

        _setEndRule: function() {
            var that = this,
                rule = that._value,
                container = that._container,
                namespace = that._namespace,
                click = function(e) {
                    that._toggleEndRule(e.currentTarget.value);
                    that.trigger("change");
                };

            that.radioButtonNever = container.find(".k-recur-end-never").on(CLICK + namespace, click);
            that.radioButtonCount = container.find(".k-recur-end-count").on(CLICK + namespace, click);
            that.radioButtonUntil = container.find(".k-recur-end-until").on(CLICK + namespace, click);

            if (rule.count) {
                that._toggleEndRule("count");
            } else if (rule.until) {
                that._toggleEndRule("until");
            } else {
                that._toggleEndRule();
            }
        },

        _setMonthRule: function() {
            var that = this,
                rule = that._value,
                click = function(e) {
                    that._toggleMonthDayRule(e.currentTarget.value);
                    that.trigger("change");
                },
                radioButtons = that._container.find(".k-recur-month-radio").on(CLICK + that._namespace, click);

            that.radioButtonMonthDay = radioButtons.eq(0);
            that.radioButtonWeekDay = radioButtons.eq(1);

            if (rule.weekDays) {
                that._toggleMonthDayRule("weekday");
            } else {
                that._toggleMonthDayRule("monthday");
            }
        },

        _setYearRule: function() {
            var that = this,
                rule = that._value,
                click = function(e) {
                    that._toggleYearRule(e.currentTarget.value);
                    that.trigger("change");
                },
                radioButtons = that._container.find(".k-recur-year-radio").on(CLICK + that._namespace, click);

            that.radioButtonMonthDay = radioButtons.eq(0);
            that.radioButtonWeekDay = radioButtons.eq(1);

            if (rule.weekDays) {
                that._toggleYearRule("weekday");
            } else {
                that._toggleYearRule("monthday");
            }
        },

        _toggleEndRule: function(endRule) {
            var that = this,
                rule = that._value;

            if (endRule === "count") {
                that.radioButtonCount.prop("checked", true);

                that._until.enable(false);
                that._count.enable(true);

                rule.count = that._count.value();
                rule.until = null;
            } else if (endRule === "until") {
                that.radioButtonUntil.prop("checked", true);

                that._until.enable(true);
                that._count.enable(false);

                rule.count = null;
                rule.until = that._until.value();
            } else {
                that.radioButtonNever.prop("checked", true);

                that._until.enable(false);
                that._count.enable(false);

                rule.count = null;
                rule.until = null;
            }
        },

        _toggleMonthDayRule: function(monthRule) {
            var that = this,
                rule = that._value;

            if (monthRule === "monthday") {
                that.radioButtonMonthDay.prop("checked", true);

                that._initMonthDay.enable(true);
                that._weekDay.enable(false);
                that._weekDayOffset.enable(false);

                rule.weekDays = null;
                rule.monthDays = [that._initMonthDay.value()];

            } else {
                that.radioButtonWeekDay.prop("checked", true);

                that._initMonthDay.enable(false);
                that._weekDayOffset.enable(true);
                that._weekDay.enable(true);

                rule.monthDays = null;
                rule.weekDays = [{
                    offset: Number(that._weekDayOffset.value()),
                    day: Number(that._weekDay.value())
                }];
            }
        },

        _toggleYearRule: function(yearRule) {
            var that = this,
                month;

            if (yearRule === "monthday") {
                that._month1.enable(true);
                that._month2.enable(false);

                month = that._month1.value();
            } else {
                that._month1.enable(false);
                that._month2.enable(true);

                month = that._month2.value();
            }
            that._value.months = [month];
            that._toggleMonthDayRule(yearRule);
        },

        _initContainer: function() {
            var element = this.element,
                container = $('<div class="k-recur-view" />'),
                editContainer = element.parent(".k-edit-field");

            if (editContainer[0]) {
                container.insertAfter(editContainer);
            } else {
                element.append(container);
            }

            this._container = container;
        },

        _initFrequency: function() {
            var that = this,
                options = that.options,
                frequencies = options.frequencies,
                messages = options.messages.frequencies,
                ddl = $('<input />'),
                frequency;

            frequencies = $.map(frequencies, function(frequency) {
                return {
                    text: messages[frequency],
                    value: frequency
                };
            });

            frequency = frequencies[0];
            if (frequency && frequency.value === "never") {
                frequency.value = "";
            }

            that.element.append(ddl);
            that._frequency = new DropDownList(ddl, {
                dataTextField: "text",
                dataValueField: "value",
                dataSource: frequencies,
                change: function() {
                    that._value = {};
                    that._initView(that._frequency.value());
                    that.trigger("change");
                }
            });
        }
    });

    ui.plugin(RecurrenceEditor);

    var recurrenceHeaderTemplate = kendo.template('<div class="k-edit-label"><label>#:headerTitle#</label></div>' +
      '<div class="k-edit-field k-recur-pattern k-scheduler-toolbar"></div>' +
      '<div class="k-recur-view"></div>'
    );

    var repeatPatternTemplate = kendo.template(
       '# if (frequency !== "never") { #' +
           '<div class="k-edit-label"><label>#:messages.repeatEvery#</label></div>' +
           '<div class="k-edit-field"><input class="k-recur-interval" pattern="\\\\d*"/>#:messages.interval#</div>' +
       '# } #' +
       '# if (frequency === "weekly") { #' +
           '<div class="k-edit-label"><label>#:messages.repeatOn#</label></div>' +
           '<div class="k-edit-field">#=weekDayCheckBoxes(firstWeekDay)#</div>' +
       '# } else if (frequency === "monthly") { #' +
           '<div class="k-edit-label"><label>#:messages.repeatBy#</label></div>' +
           '<div class="k-edit-field k-scheduler-toolbar k-repeat-rule"></div>' +
           '<div class="k-monthday-view" style="display:none">' +
               '<div class="k-edit-label"><label>#:messages.day#</label></div>' +
               '<div class="k-edit-field"><input class="k-recur-monthday" pattern="\\\\d*"/></div>' +
           '</div>' +
           '<div class="k-weekday-view" style="display:none">' +
               '<div class="k-edit-label"><label>#:messages.every#</label></div>' +
               '<div class="k-edit-field"><input class="k-recur-weekday-offset" /></div>' +
               '<div class="k-edit-label"><label>#:messages.day#</label></div>' +
               '<div class="k-edit-field"><input class="k-recur-weekday" /></div>' +
           '</div>' +
       '# } else if (frequency === "yearly") { #' +
           '<div class="k-edit-label"><label>#:messages.repeatBy#</label></div>' +
           '<div class="k-edit-field k-scheduler-toolbar k-repeat-rule"></div>' +
           '<div class="k-monthday-view" style="display:none">' +
               '<div class="k-edit-label"><label>#:messages.day#</label></div>' +
               '<div class="k-edit-field"><input class="k-recur-monthday" pattern="\\\\d*"/></div>' +
           '</div>' +
           '<div class="k-weekday-view" style="display:none">' +
               '<div class="k-edit-label"><label>#:messages.every#</label></div>' +
               '<div class="k-edit-field"><input class="k-recur-weekday-offset" /></div>' +
               '<div class="k-edit-label"><label>#:messages.day#</label></div>' +
               '<div class="k-edit-field"><input class="k-recur-weekday" /></div>' +
           '</div>' +
           '<div class="k-edit-label"><label>#:messages.month#</label></div>' +
           '<div class="k-edit-field"><input class="k-recur-month" /></div>' +
       '# } #'
    );

    var endPatternTemplate = kendo.template(
        '# if (endPattern === "count") { #' +
           '<div class="k-edit-label"><label>#:messages.after#</label></div>' +
           '<div class="k-edit-field"><input class="k-recur-count" pattern="\\\\d*" /></div>' +
        '# } else if (endPattern === "until") { #' +
           '<div class="k-edit-label"><label>#:messages.on#</label></div>' +
           '<div class="k-edit-field"><input type="date" class="k-recur-until" /></div>' +
        '# } #'
    );

    var MOBILEGROUPBUTTON = kendo.template(
        '<ul class="k-reset k-header k-toolbar k-scheduler-navigation">' +
            '#for (var i = 0, length = dataSource.length; i < length; i++) {#' +
                '<li class="k-state-default #= value === dataSource[i].value ? \"k-state-selected\" : \"\" #">' +
                    '<a role="button" href="\\#" class="k-link" data-#=ns#value="#=dataSource[i].value#">#:dataSource[i].text#</a>' +
                '</li>' +
            '#}#'  +
        '</ul>'
    );

    var MobileRecurrenceEditor = BaseRecurrenceEditor.extend({
        init: function(element, options) {
            var that = this;

            BaseRecurrenceEditor.fn.init.call(that, element, options);

            options = that.options;

            that.value(options.value);

            that._pane = options.pane;

            that._repeatStatus();

            that._repeatEnd();
        },

        options: {
            name: "MobileRecurrenceEditor",
            spinners: false,
            messages: {
                endTitle: "Repeat ends",
                repeatTitle: "Repeat pattern",
                end: {
                    patterns: {
                        never: "Never",
                        after: "After...",
                        on: "On..."
                    },
                    never: "Never",
                    after: "End repeat after",
                    on: "End repeat on"
                },
                monthly: {
                    interval: " month(s)",
                    repeatBy: "Repeat by: ",
                    dayOfMonth: "Day of the month",
                    dayOfWeek: "Day of the week",
                    repeatEvery: "Repeat every",
                    every: "Every",
                    day: "Day "
                },
                yearly: {
                    interval: " year(s)",
                    repeatBy: "Repeat by: ",
                    dayOfMonth: "Day of the month",
                    dayOfWeek: "Day of the week",
                    repeatEvery: "Repeat every: ",
                    every: "Every",
                    month: "Month",
                    day: "Day"
                }
            }
        },

        events: [ "change" ],

        _repeatStatus: function() {
            var that = this;
            var pane = that._pane;
            var freq = this.options.messages.frequencies[this._value.freq || "never"];
            var repeatButton = $('<a href="#" class="k-button k-scheduler-recur">' + freq + '</a>')
                                    .on(CLICK + that._namespace, function() {
                                        that._createView("repeat");
                                        pane.navigate("recurrence");
                                    });

            that._repeatButton = repeatButton;
            that.element.append(repeatButton);
        },

        _repeatEnd: function() {
            var that = this,
                rule = that._value,
                editField = that.element.parent(".k-edit-field");

            var endEditField = $('<div class="k-edit-field"><a href="#" class="k-button k-scheduler-recur-end">Never</a></div>')
                .on(CLICK + that._namespace, function(e) {
                    e.preventDefault();

                    if (!that._value.freq) {
                        return;
                    }

                    that._createView("end");

                    that._pane.navigate("recurrence");
                })
                .insertAfter(editField);

            var endLabelField = $('<div class="k-edit-label"><label>Ends</label></div>').insertAfter(editField);

            that._endButton = endEditField.find(".k-scheduler-recur-end");
            that._endFields = endLabelField.add(endEditField).toggleClass("k-state-disabled", !that._value.freq);

            var messages = that.options.messages;
            var text = messages.end.never;

            if (rule.count) {
                text = kendo.format("{0} {1}", messages.end.after, rule.count);
            } else if (rule.until) {
                text = kendo.format("{0} {1:d}", messages.end.on, rule.until);
            }

            that._endButton.text(text);
        },

        _initFrequency: function() {
            var that = this;
            var frequencyMessages = that.options.messages.frequencies;

            var html = MOBILEGROUPBUTTON({
                dataSource: $.map(this.options.frequencies, function(frequency) {
                    return {
                        text: frequencyMessages[frequency],
                        value: frequency !== "never" ? frequency : ""
                    };
                }),
                value: that._value.freq || "",
                ns: kendo.ns
            });

            that._view.element
                .find(".k-recur-pattern")
                .append(html)
                .on(CLICK + that._namespace, ".k-scheduler-navigation li", function(e) {
                    var li = $(this);

                    li.addClass("k-state-selected")
                    .siblings().removeClass("k-state-selected");

                    that._value = { freq: li.children("a").attr(kendo.attr("value")) };
                    that._initRepeatView();
                });
        },

        _repeatEndChooser: function() {
            var that = this;
            var endMessages = that.options.messages.end.patterns;
            var rule = that._value;
            var value = "";

            if (rule.count) {
                value = "count";
            } else if (rule.until) {
                value = "until";
            }

            var html = MOBILEGROUPBUTTON({
                dataSource: [
                    { text: endMessages.never, value: "" },
                    { text: endMessages.after, value: "count" },
                    { text: endMessages.on, value: "until" }
                ],
                value: value,
                ns: kendo.ns
            });

            that._view.element
                .find(".k-recur-pattern")
                .append(html)
                .on(CLICK + that._namespace, ".k-scheduler-navigation li", function(e) {
                    var li = $(this);

                    li.addClass("k-state-selected")
                      .siblings().removeClass("k-state-selected");

                    value = li.children("a").attr(kendo.attr("value"));

                    if (value === "count") {
                        rule.until = null;
                    } else if (value === "until") {
                        rule.count = null;
                    } else {
                        rule.count = rule.until = null;
                    }

                    that._initEndView(value);

                    if (that._count) {
                        rule.count = that._count.value();
                    } else if (that._until) {
                        rule.until = kendo.parseDate(that._until.val(), "yyyy-MM-dd");
                    }
                });
        },

        value: function(value) {
            var that = this,
                frequencies = that.options.messages.frequencies,
                timezone = that.options.timezone;

            if (value === undefined) {
                if (!that._value.freq) {
                    return "";
                }

                return serialize(that._value, timezone);
            }

            that._value = parseRule(value, timezone) || {};
        },

        _createView: function(viewType) {
            var that = this;
            var options = that.options;
            var messages = options.messages;
            var updateText = "Save";
            var cancelText = "Cancel";
            var titleText = "Repeat Event"

            var html = '<div data-role="view" class="k-popup-edit-form" id="recurrence">' +
                       '<div data-role="header"><a href="#" class="k-button k-scheduler-cancel">' + cancelText + '</a>' +
                       titleText + '<a href="#" class="k-button k-scheduler-update">' + updateText + '</a></div>' +
                       recurrenceHeaderTemplate({
                           headerTitle: viewType === "repeat" ? messages.repeatTitle : messages.endTitle
                       });

            that._view = that._pane.append(html);

            that._view.element.on(CLICK + that._namespace, "a.k-scheduler-cancel, a.k-scheduler-update", function(e) {
                e.preventDefault();
                e.stopPropagation();

                if ($(this).hasClass("k-scheduler-update")) {
                    that.trigger("change");
                }

                var rule = that._value;
                var freq = messages.frequencies[rule.freq || "never"];

                that._repeatButton.text(freq);

                var text = messages.end.never;

                if (rule.count) {
                    text = kendo.format("{0} {1}", messages.end.after, rule.count);
                } else if (rule.until) {
                    text = kendo.format("{0} {1:d}", messages.end.on, rule.until);
                }

                that._endButton.text(text);
                that._endFields.toggleClass("k-state-disabled", !rule.freq);

                that._view.destroy();
                that._view.element.remove();

                that._pane.navigate("#edit");
            });

            that._container = that._view.element.find(".k-recur-view");

            if (viewType === "repeat") {
                this._initFrequency();
                this._initRepeatView();
            } else {
                this._repeatEndChooser();
                this._initEndView();
            }
        },

        _initRepeatView: function() {
            var that = this;
            var frequency = that._value.freq || "never";

            var data = {
                 frequency: frequency,
                 weekDayCheckBoxes: weekDayCheckBoxes,
                 firstWeekDay: that.options.firstWeekDay,
                 messages: that.options.messages[frequency]
            };

            var html = repeatPatternTemplate(data);
            var container = that._container;
            var rule = that._value;

            kendo.destroy(container);
            container.html(html);

            if (!html) {
                that._value = {};
                return;
            }

            if (frequency === "weekly" && !rule.weekDays) {
                 rule.weekDays = [{
                    day: this.options.start.getDay(),
                    offset: 0
                 }];
            }

            that._initInterval();
            that._initMonthDay();
            that._initWeekDays();
            that._initWeekDay();
            that._initMonth();

            that._period();
        },

        _initEndView: function (endPattern) {
            var that = this;
            var rule = that._value;

            if (endPattern === undefined) {
                if (rule.count) {
                    endPattern = "count";
                } else if (rule.until) {
                    endPattern = "until";
                }
            }

            var data = {
                 endPattern: endPattern,
                 messages: that.options.messages.end
            };

            kendo.destroy(that._container);
            that._container.html(endPatternTemplate(data));

            that._initCount();
            that._initUntil();
        },

        _initMonth: function() {
            var that = this;
            var rule = that._value;
            var start = that.options.start;
            var month = rule.months || [start.getMonth() + 1];
            var monthInput = that._container.find(".k-recur-month");
            var monthNames = kendo.culture().calendar.months.names;
            var monthDropDownList;

            if (monthInput[0]) {
                that.monthDropDownList = new DropDownList(monthInput, {
                    dataTextField: "text",
                    dataValueField: "value",
                    dataSource: $.map(monthNames, function(monthName, idx) {
                        return {
                            text: monthName,
                            value: idx + 1
                        };
                    }),
                    change: function() {
                        rule.months = [Number(this.value())];
                    }
                });

                if (month) {
                    that.monthDropDownList.value(month[0]);
                }
            }

        },

        _period: function() {
            var that = this;
            var rule = that._value;
            var container = that._container;
            var messages = that.options.messages[rule.freq];
            var repeatRuleGroupButton = container.find(".k-repeat-rule");
            var weekDayView = container.find(".k-weekday-view");
            var monthDayView = container.find(".k-monthday-view");

            if (repeatRuleGroupButton[0]) {
                var currentValue = rule.weekDays ? "weekday" : "monthday";

                var html = MOBILEGROUPBUTTON({
                    value : currentValue,
                    dataSource: [
                        { text: messages.dayOfMonth, value: "monthday" },
                        { text: messages.dayOfWeek, value: "weekday" }
                    ],
                    ns: kendo.ns
                });

                var init = function(val) {
                    var weekDayName = that._weekDay.value();
                    var weekDayOffset = that._weekDayOffset.value();
                    var monthDay = that._initMonthDay.value();
                    var month = that.monthDropDownList ? that.monthDropDownList.value() : null;

                    if (val === "monthday") {
                        rule.weekDays = null;
                        rule.monthDays = monthDay ? [monthDay] : monthDay;
                        rule.months = month ? [Number(month)] : month;

                        weekDayView.hide();
                        monthDayView.show();
                    } else {
                        rule.monthDays = null;
                        rule.months = month ? [Number(month)] : month;

                        rule.weekDays = [{
                            offset: Number(weekDayOffset),
                            day: Number(weekDayName)
                        }];

                        weekDayView.show();
                        monthDayView.hide();
                    }
                };

                repeatRuleGroupButton
                    .append(html)
                    .on(CLICK + that._namespace, ".k-scheduler-navigation li", function(e) {
                        var li = $(this).addClass("k-state-selected");

                        li.siblings().removeClass("k-state-selected");

                        var value = li.children("a").attr(kendo.attr("value"));

                        init(value);
                    });

                init(currentValue);
            }
        },

        _initUntil: function() {
            var that = this,
                input = that._container.find(".k-recur-until"),
                start = that.options.start,
                rule = that._value,
                until = rule.until;

            that._until = input.attr("min", kendo.toString(until && until < start ? until : start, "yyyy-MM-dd"))
                               .val(kendo.toString(until || start, "yyyy-MM-dd"))
                               .on("change", function() {
                                   rule.until = kendo.parseDate(this.value, "yyyy-MM-dd");
                               });
        },
    });

    ui.plugin(MobileRecurrenceEditor);

})(window.kendo.jQuery);
