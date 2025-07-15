interface Summary {
    dailySummary : DailySummaryConfig
    performanceSummary : PerformanceSummaryConfig
    systemName : string
}

interface DailySummaryConfig {
    description : string
    badge : string
    score : string
    footerText : string
    investigateQuestion : string
}

/*
How to determine what to show in the application

Graph will have the following things

SystemFilter  will be derived from systemColumns subset that can be specifed from the snowflake
I need view Specifications for know what to show in the ui given the soecification
I need specification for now the change the graphs and filters in different views

First you in there ans say what is the system and then you get teh SYSTEM_NAME : string
Then you extract the data into snowflake or build a connector so that now you have columns

to define graph you can define them as follows 
1. parameterized data transformation
2. given transformed data : { xcolumn , xtype , ycolumn , ytype}  + define the filters that 1. direct transformation on graph 2. change in the paramteres in the data transformation step

define views i.e. layout of graphs parametrized




*/
