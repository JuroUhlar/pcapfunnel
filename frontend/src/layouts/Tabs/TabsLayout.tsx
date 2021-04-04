import * as React from 'react';
import { Tab, TabList, TabPanel, Tabs } from 'react-tabs';
import { ConnectionView } from '../DetailView/ConnectionView';
import { IpView } from '../DetailView/IpView';
import { Dashboard } from '../Dashboard/Dashboard';
import 'react-tabs/style/react-tabs.css';
import styles from './TabsLayout.module.css';
const Mousetrap = require("mousetrap");

interface TabsLayoutState {
    tabIndex: number;
    detailIp: string | null;
    detailConnection: string[] | null;
}

/**
 * Renders and alternate layout (unused in the final version) that display IpView and ConnectionView in a separate tab insted of a modal
 * Rejected development branch, but could be useful later
 * You can toggle between the two views inside config.ts
 */
export class TabsLayout extends React.PureComponent<any, TabsLayoutState> {
    constructor(props: any) {
        super(props);
        this.state = {
            tabIndex: 0,
            detailIp: null,
            detailConnection: null,
        }
        this.topDownRef = React.createRef();
    }

    topDownRef: React.RefObject<Dashboard>;

    setTabIndex = (index: number) => {
        this.setState(() => ({
            tabIndex: index
        }))
    }

    openIpModal = (ip: string) => {
        this.setState(() => ({
            detailIp: ip,
            detailConnection: null
        }));
        this.setTabIndex(1);
        Mousetrap.bind("esc", this.goBack)
    }

    openConnectionModal = (connection: string[]) => {
        this.setState(() => ({
            detailIp: null,
            detailConnection: [connection[0], connection[1]]
        }));
        this.setTabIndex(1);
        Mousetrap.bind("esc", this.goBack)
    }

    goBack = () => {
        this.setTabIndex(0);
    }

    render() {
        return (
            <Tabs
                selectedIndex={this.state.tabIndex}
                onSelect={index => this.setTabIndex(index)}
                forceRenderTabPanel={true}>
                <TabList>
                    <div className={styles.tabList}>
                        <Tab>Dataset</Tab>
                        {this.state.detailIp && <Tab>{this.state.detailIp}</Tab>}
                        {this.state.detailConnection && <Tab>{`${this.state.detailConnection[0]} <=> ${this.state.detailConnection[1]}`} </Tab>}
                    </div>
                </TabList>
                <TabPanel>
                    <Dashboard ref={this.topDownRef}
                        openConnectionTab={this.openConnectionModal}
                        openIpTab={this.openIpModal}
                    />
                </TabPanel>

                {this.state.detailIp &&
                    <TabPanel>
                        <IpView
                            key={this.state.detailIp}
                            ip={this.state.detailIp}
                            dataset={this.topDownRef.current!.state.filteredDataset}
                            openIpModal={this.openIpModal}
                            openConnectionModal={this.openConnectionModal}
                            settings={this.topDownRef.current!.state.settings}
                            
                            />
                    </TabPanel>}
                {this.state.detailConnection &&
                    <TabPanel>
                        <ConnectionView
                            key={this.state.detailConnection.toString()}
                            connection={this.state.detailConnection}
                            dataset={this.topDownRef.current!.state.filteredDataset}
                            openIpModal={this.openIpModal}
                            openConnectionModal={this.openConnectionModal} 
                            settings={this.topDownRef.current!.state.settings}
                            />
                    </TabPanel>}
            </Tabs>
        )
    }
}