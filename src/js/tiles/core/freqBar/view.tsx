/*
 * Copyright 2018 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2018 Institute of the Czech National Corpus,
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
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { DataRow } from '../../../common/api/kontext/freqs';
import { Theme } from '../../../common/theme';
import { CoreTileComponentProps, TileComponent } from '../../../common/tile';
import { GlobalComponents } from '../../../views/global';
import { ActionName, Actions } from './actions';
import { FreqBarModel, FreqBarModelState } from './model';
import { listMaxItem, flatMapList } from '../../../common/collections';


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:FreqBarModel):TileComponent {

    const globComponents = ut.getComponents();


    // ------- <ChartWrapper /> ---------------------------------------------------

    const ChartWrapper:React.SFC<{
        data:Array<DataRow>;
        width:string|number;
        height:string|number;
        isMobile:boolean;

    }> = (props) => {
        if (props.isMobile) {
            return (
                <BarChart data={props.data}
                        width={typeof props.width === 'string' ? parseInt(props.width) : props.width}
                        height={typeof props.height === 'string' ? parseInt(props.height) : props.height}
                        layout="vertical"
                        isAnimationActive={false}>
                    {props.children}
                </BarChart>
            );

        } else {
            return (
                <ResponsiveContainer width={props.width} height={props.height}>
                    <BarChart data={props.data} layout="vertical">
                        {props.children}
                    </BarChart>
                </ResponsiveContainer>
            );
        }
    }

    // -------------- <TableView /> -------------------------------------

    const TableView:React.SFC<{
        data:Array<DataRow>;
    }> = (props) => {
        return (
            <table className="data">
                <thead>
                    <tr>
                        <th />
                        <th>{ut.translate('mergeCorpFreq_abs_freq')}</th>
                        <th>{ut.translate('mergeCorpFreq_rel_freq')}</th>
                    </tr>
                </thead>
                <tbody>
                    {props.data.map((row, i) => (
                        <tr key={`${i}:${row.name}`}>
                            <td className="word">{row.name}</td>
                            <td className="num">{ut.formatNumber(row.freq)}</td>
                            <td className="num">{ut.formatNumber(row.ipm)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }

    // -------------------------- <Chart /> --------------------------------------

    const Chart:React.SFC<{
        data:Array<DataRow>;
        width:string|number;
        height:string|number;
        isMobile:boolean;

    }> = (props) => {
        const maxLabelWidth = listMaxItem(props.data, v => v.name.length).name.length;
        return (
            <div className="Chart">
                <ChartWrapper data={props.data} isMobile={props.isMobile} width={props.width} height={props.height}>
                    <CartesianGrid />
                    <Bar data={props.data} dataKey="ipm" fill={theme.barColor(0)} isAnimationActive={false}
                            name={ut.translate('freqBar__rel_freq')} />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={Math.max(60, maxLabelWidth * 8)} />
                    <Legend />
                    <Tooltip cursor={false} isAnimationActive={false} />
                </ChartWrapper>
            </div>
        );
    };

    // -------------------------- <FreqBarTile /> --------------------------------------

    class FreqBarTile extends React.PureComponent<FreqBarModelState & CoreTileComponentProps> {

        private chartsRef:React.RefObject<HTMLDivElement>;

        constructor(props) {
            super(props);
            this.chartsRef = React.createRef();
            this.handleScroll = this.handleScroll.bind(this);
            this.handleDotClick = this.handleDotClick.bind(this);
        }

        private handleScroll():void {
            dispatcher.dispatch<Actions.SetActiveBlock>({
                name: ActionName.SetActiveBlock,
                payload: {
                    idx: Math.round(this.chartsRef.current.scrollLeft / this.props.renderSize[0]),
                    tileId: this.props.tileId
                }
            });
        }

        private handleDotClick(idx:number) {
            if (this.chartsRef.current && this.props.isMobile) {
                this.chartsRef.current.scrollLeft = Math.round(this.props.renderSize[0] * 0.92 * idx);
            }
        }

        render() {
            const chartsViewBoxWidth = this.props.isMobile ? '100%' : `${100 / this.props.blocks.length}%`;
            return (
                <globComponents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.blocks.find(v => v.isReady) !== undefined}
                        sourceIdent={{corp: this.props.corpname}}
                        backlink={this.props.backlink}
                        supportsTileReload={this.props.supportsReloadOnError}
                        issueReportingUrl={this.props.issueReportingUrl}>
                    <div className="FreqBarTile">
                        {this.props.isAltViewMode ?
                            flatMapList(this.props.blocks, (block, blockId) => [
                                <h3 key={'h' + blockId} style={{textAlign: 'center'}}>{block.label}</h3>,
                                <TableView key={'t' + blockId} data={block.data}/>
                            ]) :
                            <div>
                                <div className={`charts${this.props.isBusy ? ' incomplete' : ''}`} ref={this.chartsRef} onScroll={this.handleScroll}>
                                    {this.props.blocks.filter(block => block.isReady).map(block => {
                                        const chartWidth = this.props.isMobile ? (this.props.renderSize[0] * 0.9).toFixed() : "90%";
                                        return  (
                                            <div key={block.ident} style={{width: chartsViewBoxWidth, height: "100%"}}>
                                                <h3>{block.label}</h3>
                                                {block.data.length > 0 ?
                                                    <Chart data={block.data} width={chartWidth} height={70 + block.data.length * 40}
                                                            isMobile={this.props.isMobile} /> :
                                                    <p className="note" style={{textAlign: 'center'}}>No result</p>
                                                }
                                            </div>
                                        );
                                        })}
                                </div>
                                {this.props.isMobile && this.props.blocks.length > 1 ?
                                    <globComponents.HorizontalBlockSwitch htmlClass="ChartSwitch"
                                            blockIndices={this.props.blocks.map((_, i) => i)}
                                            currentIdx={this.props.activeBlock}
                                            onChange={this.handleDotClick} /> :
                                    null
                                }
                            </div>
                        }
                    </div>
                </globComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, FreqBarModelState>(FreqBarTile, model);
}