/*
 * Copyright 2019 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2019 Institute of the Czech National Corpus,
 *                Faculty of Arts, Charles University
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { IActionDispatcher, BoundWithProps, ViewUtils } from 'kombo';
import * as React from 'react';
import { Color } from 'cnc-tskit';

import { Theme } from '../../../common/theme';
import { CoreTileComponentProps, TileComponent } from '../../../common/tile';
import { GlobalComponents } from '../../../views/global';
import { ActionName, Actions } from './common';
import { CollocModel } from './model';
import { Actions as GlobalActions, ActionName as GlobalActionName } from '../../../models/actions';
import { init as wcloudViewInit } from '../../../views/wordCloud/index';
import { DataRow, SrchContextType, DataHeading } from '../../../common/api/abstract/collocations';
import { CollocModelState } from '../../../common/models/collocations';


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:CollocModel):TileComponent {

    const globalCompontents = ut.getComponents();
    const WordCloud = wcloudViewInit<DataRow>(dispatcher, ut, theme);

    // -------------- <Controls /> -------------------------------------

    const Controls:React.SFC<{
        tileId:number;
        value:SrchContextType;

    }> = (props) => {

        const handleChange = (evt:React.ChangeEvent<HTMLSelectElement>) => {
            dispatcher.dispatch<GlobalActions.SubqChanged>({
                name: GlobalActionName.SubqChanged,
                payload: {
                    tileId: props.tileId
                }
            });
            dispatcher.dispatch<Actions.SetSrchContextType>({
                name: ActionName.SetSrchContextType,
                payload: {
                    tileId: props.tileId,
                    ctxType: evt.target.value as SrchContextType
                }
            });
        }

        return (
            <form className="Controls cnc-form tile-tweak">
                <label>{ut.translate('collocations__search_in_context_label')}: </label>
                <select value={props.value} onChange={handleChange}>
                    <option value={SrchContextType.LEFT}>
                        {ut.translate('collocations__context_left')}
                    </option>
                    <option value={SrchContextType.RIGHT}>
                        {ut.translate('collocations__context_right')}
                    </option>
                    <option value={SrchContextType.BOTH}>
                        {ut.translate('collocations__context_both')}
                    </option>
                </select>
            </form>
        );
    };

    // -------------- <TableView /> -------------------------------------

    const TableView:React.SFC<{
        data:Array<DataRow>;
        heading:DataHeading;
        caption:string;
    }> = (props) => {
        return (
            <table className="data">
                <caption>{props.caption}</caption>
                <thead>
                    <tr>
                        <th />
                        {props.heading.map((h, i) => <th key={`${i}:${h.ident}`}>{h.label}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {props.data.map((row, i) => (
                        <tr key={`${i}:${row.str}`}>
                            <td className="word">{row.str}</td>
                            <td className="num">{ut.formatNumber(row.freq)}</td>
                            {row.stats.map((stat, i) => <td key={`stat-${i}`} className="num">{ut.formatNumber(stat, 2)}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }


    // -------------- <CollocTile /> -------------------------------------

    class CollocTile extends React.PureComponent<CollocModelState & CoreTileComponentProps> {

        constructor(props) {
            super(props);
        }

        render() {
            const sortItemIdx = this.props.heading.findIndex(v => v.ident === this.props.sortByMetric);
            const dataTransform = (v:DataRow) => ({
                text: v.str,
                value: sortItemIdx > 0 ? v.stats[sortItemIdx - 1] : v.freq, // abs attr is not in the stats array (=> -1)
                tooltip: v.stats.map((v, i) => ({label: this.props.heading[i+1].label,  value: v, round: 1})),
                interactionId: v.interactionId
            });

            const colorGen = this.props.data.length > 1 ? theme.scaleColorCmpDerived : (_:number) => theme.scaleColorIndexed();

            return (
                <globalCompontents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error} htmlClass="CollocTile"
                        hasData={this.props.data.some(data => data !== null && data.length > 0)} sourceIdent={{corp: this.props.corpname}}
                        backlink={this.props.backlink} supportsTileReload={this.props.supportsReloadOnError}
                        issueReportingUrl={this.props.issueReportingUrl}>
                    {this.props.isTweakMode ?
                            <div className="tweak-box"><Controls tileId={this.props.tileId} value={this.props.srchRangeType} /></div> :
                        null
                    }
                    <div className="boxes" style={{flexWrap: this.props.isMobile ? 'wrap' : 'nowrap'}}>
                        {this.props.data.map((data, index) => this.props.isAltViewMode ?
                            <TableView key={index} heading={this.props.heading} data={data} caption={this.props.data.length > 1 ? this.props.queryMatches[index].word : null} /> :
                            data ?
                                <globalCompontents.ResponsiveWrapper minWidth={this.props.isMobile ? undefined : 250} key={index} render={(width:number, height:number) => (
                                    <div className="colloc-cloud">
                                        {this.props.data.length > 1 ?
                                            <h2>{`[${index + 1}] ${this.props.queryMatches[index].word}`}</h2> :
                                            null
                                        }
                                        <WordCloud width={width} height={height} data={data} isMobile={this.props.isMobile}
                                                font={theme.infoGraphicsFont}
                                                dataTransform={dataTransform}
                                                selectedText={this.props.data.length > 1 ? this.props.selectedText : null}
                                                colors={colorGen(index)} />
                                    </div>
                                )} /> :
                                <globalCompontents.ResponsiveWrapper key={`${index}empty`}
                                    render={() => data === null ?
                                        <p>{ut.translate('collocations__processing') + '\u2026'}</p> :
                                        <p>{ut.translate('collocations__no_data')}</p>} />
                        )}
                    </div>
                </globalCompontents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, CollocModelState>(CollocTile, model);

}
