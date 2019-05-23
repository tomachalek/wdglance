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
import * as React from 'react';
import { IActionDispatcher, ViewUtils, BoundWithProps } from 'kombo';
import { GlobalComponents } from '../../views/global';
import { Theme } from '../../common/theme';
import { TileComponent, CoreTileComponentProps } from '../../common/tile';
import { ConcFilterModel, ConcFilterModelState } from './model';
import { Line, LineElement } from '../../common/api/abstract/concordance';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../models/actions';
import { ActionName, Actions } from './actions';

export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:ConcFilterModel):TileComponent {

    const globalCompontents = ut.getComponents();

    // ------------------ <LineMetadata /> --------------------------------------------

    const LineMetadata:React.SFC<{
        data:Array<{value:string; label:string}>;

    }> = (props) => {

        const handleClick = (e:React.MouseEvent) => {
            e.stopPropagation();
        };

        return (
            <div className="LineMetadata" onClick={handleClick}>
                <table>
                    <tbody>
                        {props.data.map(v => <tr key={v.label}><th>{v.label}:</th><td>{v.value}</td></tr>)}
                    </tbody>
                </table>
            </div>
        )
    }


    // ------------------ <FilteredLine /> --------------------------------------------

    const FilteredLine:React.SFC<{
        data:Line;
        hasVisibleMetadata:boolean;
        handleLineClick:(e:React.MouseEvent)=>void;

    }> = (props) => {

        const handleWordClick = (e:React.MouseEvent<HTMLAnchorElement>) => {
            const word = (e.target as Element).getAttribute('data-value');
            dispatcher.dispatch<GlobalActions.ChangeQueryInput>({
                name: GlobalActionName.ChangeQueryInput,
                payload: {
                    value: word
                }
            });
            dispatcher.dispatch<GlobalActions.SubmitQuery>({
                name: GlobalActionName.SubmitQuery
            });
        };

        const mkColloc = (side:'L'|'R') => (e:LineElement, i:number) => e.class === 'coll' ?
            <a key={`${props.data.toknum}:${side}${i}`} data-value={e.str} onClick={handleWordClick} className={e.class}
                    title={ut.translate('global__click_to_query_word')}>{e.str}</a> :
            <span key={`${props.data.toknum}:${side}${i}`} className={e.class}>{e.str}</span>;

        return (
            <div className="FilteredLine">
                {props.hasVisibleMetadata ? <LineMetadata data={props.data.metadata} /> : null}
                <div className="flex">
                    <a className="info-click" onClick={props.handleLineClick}><img src={ut.createStaticUrl('info-icon.svg')} /></a>
                    <p className={props.data.isHighlighted ? 'highlighted' : ''}>
                    {props.data.left.map(mkColloc('L'))}
                    {props.data.kwic.map((v, i) => <span className="kwic" key={`${props.data.toknum}:K${i}`}>{v.str}</span>)}
                    {props.data.right.map(mkColloc('R'))}
                    </p>
                </div>
            </div>
        );
    };

    // ------------------ <CollocExamplesView /> --------------------------------------------

    class CollocExamplesView extends React.PureComponent<ConcFilterModelState & CoreTileComponentProps> {

        constructor(props) {
            super(props);
        }

        private handleLineClick(idx:number) {
            return (e:React.MouseEvent) => {
                if (this.props.visibleMetadataLine === idx) {
                    dispatcher.dispatch<Actions.HideLineMetadata>({
                        name: ActionName.HideLineMetadata
                    });

                } else {
                    dispatcher.dispatch<Actions.ShowLineMetadata>({
                        name: ActionName.ShowLineMetadata,
                        payload: {
                            idx: idx
                        }
                    });
                }
                e.stopPropagation();
            }
        }

        render() {
            return (
                <globalCompontents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.lines.size > 0}
                        sourceIdent={{corp: this.props.corpName}}
                        supportsTileReload={this.props.supportsReloadOnError}>
                    <div className="CollocExamplesView">
                        <div className="sentences">
                            {this.props.lines.map((v, i) =>
                                <FilteredLine key={`${i}:${v.toknum}`} data={v} hasVisibleMetadata={this.props.visibleMetadataLine === i}
                                        handleLineClick={this.handleLineClick(i)} />)
                            }
                        </div>
                    </div>
                </globalCompontents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, ConcFilterModelState>(CollocExamplesView, model);

}

