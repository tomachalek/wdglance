#!/usr/bin/env python3
#
# Copyright 2020 Tomas Machalek <tomas.machalek@gmail.com>
# Copyright 2020 Institute of the Czech National Corpus,
#                Faculty of Arts, Charles University
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
Convert sqlite3-based word frequency database to CouchDB
"""

import sys
import couchdb
import sqlite3

DB_NAME = 'freqdb3g'

def select_lines(db1):
    cursor = db1.cursor()
    cursor.execute('SELECT w.value, w.lemma, w.pos, w.count, w.arf, m.pos as lemma_pos, m.count as lemma_count, m.arf as lemma_arf, m.is_pname as lemma_is_pname FROM word AS w JOIN lemma AS m ON m.value = w.lemma')
    return cursor


def convert(db1, db2):
    buff = []
    curr_lemma = None
    i = 0
    for row in select_lines(db1):
        new_lemma, new_pos = row['lemma'], row['lemma_pos']
        if curr_lemma is None or new_lemma != curr_lemma['lemma'] or new_pos != curr_lemma['pos']:
            if curr_lemma != None:
                buff.append(curr_lemma)
            curr_lemma = {'lemma': new_lemma, 'forms': [], 'pos': new_pos, 'arf': row['lemma_arf'], 'is_pname': bool(row['lemma_is_pname']), 'count': row['lemma_count']}
        curr_lemma['forms'].append({'word': row['value'], 'count': row['count'], 'arf': row['arf']})
        if len(buff) == 10000:
            db2.update(buff)
            buff = []
        i += 1
        if i % 100000 == 0:
            print('Inserted {} records'.format(i))
    buff.append(curr_lemma)
    if len(buff) > 0:
        db2.update(buff)


if __name__ == '__main__':
    db1 = sqlite3.connect(sys.argv[1])
    db1.row_factory = sqlite3.Row
    db2 = couchdb.Server(sys.argv[2])
    convert(db1, db2[DB_NAME])