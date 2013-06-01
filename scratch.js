
RT["reno::app"] = function() {
    var local_1_0;
    block_1_0: {
        local_1_0 = RT["reno::prn"]("woot!");
    };
    return local_1_0;
};

RT["reno::-main"] = function() {
    var local_1_0;
    block_1_0: {
        RT["reno::window"][RT["reno::keyword"]("onload")] = RT["reno::app"];
        local_1_0 = RT["reno::window"][RT["reno::keyword"]("onload")];
    };
    return local_1_0;
};
RT["reno::-main"]()