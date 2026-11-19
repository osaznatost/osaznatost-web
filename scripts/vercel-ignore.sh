#!/bin/bash
# Решава дали Vercel да публикува тази версия (изход 0 = пропусни, 1 = публикувай).
# 1) Ботът за данни публикува най-много веднъж на 3 часа: пропуснатите промени влизат в следващата публикация.
#    Така безплатният лимит на публикациите не се изчерпва и данните на сайта са най-много на 3 часа.
# 2) Иначе: публикува се само ако има промени извън скриптовете, автоматизацията и суровите данни.
B=${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}
git cat-file -e "$B" 2>/dev/null || exit 1
if [ "$(git log -1 --format=%an HEAD)" = "osaznatost-bot" ]; then
  now=$(git log -1 --format=%ct HEAD); prev=$(git log -1 --format=%ct "$B")
  [ $((now - prev)) -lt 10800 ] && { echo "Бот: последната публикация е преди по-малко от 3 часа — пропускам"; exit 0; }
fi
git diff --quiet "$B" HEAD -- . ':(exclude)scripts' ':(exclude).github' ':(exclude)*.md' ':(exclude)supabase' ':(exclude)data/council' ':(exclude)data/tender-signals' ':(exclude)data/bills-src' ':(exclude)data/steno-claims.json'
