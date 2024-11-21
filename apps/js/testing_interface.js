
// Internal state.
var CURRENT_INPUT_GRID = new Grid(3, 3);
var CURRENT_OUTPUT_GRID = new Grid(3, 3);
var TEST_PAIRS = new Array();
var CURRENT_TEST_PAIR_INDEX = 0;
var COPY_PASTE_DATA = new Array();

// Cosmetic.
var EDITION_GRID_HEIGHT = 500;
var EDITION_GRID_WIDTH = 500;
var MAX_CELL_SIZE = 100;


function resetTask() {
    CURRENT_INPUT_GRID = new Grid(3, 3);
    TEST_PAIRS = new Array();
    CURRENT_TEST_PAIR_INDEX = 0;
    $('#task_preview').html('');
    resetOutputGrid();
}

function refreshEditionGrid(jqGrid, dataGrid) {
    fillJqGridWithData(jqGrid, dataGrid);
    setUpEditionGridListeners(jqGrid);
    fitCellsToContainer(jqGrid, dataGrid.height, dataGrid.width, EDITION_GRID_HEIGHT, EDITION_GRID_HEIGHT);
    initializeSelectable();
}

function syncFromEditionGridToDataGrid() {
    copyJqGridToDataGrid($('#output_grid .edition_grid'), CURRENT_OUTPUT_GRID);
}

function syncFromDataGridToEditionGrid() {
    refreshEditionGrid($('#output_grid .edition_grid'), CURRENT_OUTPUT_GRID);
}

function getSelectedSymbol() {
    selected = $('#symbol_picker .selected-symbol-preview')[0];
    return $(selected).attr('symbol');
}

function setUpEditionGridListeners(jqGrid) {
    jqGrid.find('.cell').click(function(event) {
        cell = $(event.target);
        symbol = getSelectedSymbol();

        mode = $('input[name=tool_switching]:checked').val();
        if (mode == 'floodfill') {
            // If floodfill: fill all connected cells.
            syncFromEditionGridToDataGrid();
            grid = CURRENT_OUTPUT_GRID.grid;
            floodfillFromLocation(grid, cell.attr('x'), cell.attr('y'), symbol);
            syncFromDataGridToEditionGrid();
        }
        else if (mode == 'edit') {
            // Else: fill just this cell.
            setCellSymbol(cell, symbol);
        }
    });
}

function resizeOutputGrid() {
    size = $('#output_grid_size').val();
    size = parseSizeTuple(size);
    height = size[0];
    width = size[1];

    jqGrid = $('#output_grid .edition_grid');
    syncFromEditionGridToDataGrid();
    dataGrid = JSON.parse(JSON.stringify(CURRENT_OUTPUT_GRID.grid));
    CURRENT_OUTPUT_GRID = new Grid(height, width, dataGrid);
    refreshEditionGrid(jqGrid, CURRENT_OUTPUT_GRID);
}

function resetOutputGrid() {
    syncFromEditionGridToDataGrid();
    CURRENT_OUTPUT_GRID = new Grid(3, 3);
    syncFromDataGridToEditionGrid();
    resizeOutputGrid();
}

function copyFromInput() {
    syncFromEditionGridToDataGrid();
    CURRENT_OUTPUT_GRID = convertSerializedGridToGridObject(CURRENT_INPUT_GRID.grid);
    syncFromDataGridToEditionGrid();
    $('#output_grid_size').val(CURRENT_OUTPUT_GRID.height + 'x' + CURRENT_OUTPUT_GRID.width);
}

function fillPairPreview(pairId, inputGrid, outputGrid) {
    var pairSlot = $('#pair_preview_' + pairId);
    if (!pairSlot.length) {
        // Create HTML for pair.
        pairSlot = $('<div id="pair_preview_' + pairId + '" class="pair_preview" index="' + pairId + '"></div>');
        pairSlot.appendTo('#task_preview');
    }
    var jqInputGrid = pairSlot.find('.input_preview');
    if (!jqInputGrid.length) {
        jqInputGrid = $('<div class="input_preview"></div>');
        jqInputGrid.appendTo(pairSlot);
    }
    var jqOutputGrid = pairSlot.find('.output_preview');
    if (!jqOutputGrid.length) {
        jqOutputGrid = $('<div class="output_preview"></div>');
        jqOutputGrid.appendTo(pairSlot);
    }

    fillJqGridWithData(jqInputGrid, inputGrid);
    fitCellsToContainer(jqInputGrid, inputGrid.height, inputGrid.width, 200, 200);
    fillJqGridWithData(jqOutputGrid, outputGrid);
    fitCellsToContainer(jqOutputGrid, outputGrid.height, outputGrid.width, 200, 200);
}

function loadJSONTask(train, test) {
    resetTask();
    $('#modal_bg').hide();
    $('#error_display').hide();
    $('#info_display').hide();

    for (var i = 0; i < train.length; i++) {
        pair = train[i];
        values = pair['input'];
        input_grid = convertSerializedGridToGridObject(values)
        values = pair['output'];
        output_grid = convertSerializedGridToGridObject(values)
        fillPairPreview(i, input_grid, output_grid);
    }
    for (var i=0; i < test.length; i++) {
        pair = test[i];
        TEST_PAIRS.push(pair);
    }
    values = TEST_PAIRS[0]['input'];
    CURRENT_INPUT_GRID = convertSerializedGridToGridObject(values)
    fillTestInput(CURRENT_INPUT_GRID);
    CURRENT_TEST_PAIR_INDEX = 0;
    $('#current_test_input_id_display').html('1');
    $('#total_test_input_count_display').html(test.length);
    copyFromInput()
}

function display_task_name(task_name, task_index, number_of_tasks) {
    big_space = '&nbsp;'.repeat(4);
    window.current_task_name = task_name;
    document.getElementById('task_name').innerHTML = (
        'Task name:' + big_space + task_name + big_space + (
            task_index===null ? '' :
            ( `<input name=task_index value=${task_index} style='width: 24px'>` + ' out of ' + String(number_of_tasks) )
        )
    );
    document.getElementById('task_name').querySelector('[name=task_index]').onkeydown = (e) => {
        if (e.key === 'Enter') {
            goToIndexInInput()
        }
    }
}

function loadTaskFromFile(e) {
    var file = e.target.files[0];
    if (!file) {
        errorMsg('No file selected');
        return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
        var contents = e.target.result;

        try {
            contents = JSON.parse(contents);
            train = contents['train'];
            test = contents['test'];
        } catch (e) {
            errorMsg('Bad file format');
            return;
        }
        loadJSONTask(train, test);

        $('#load_task_file_input')[0].value = "";
        display_task_name(file.name, null, null);
    };
    reader.readAsText(file);
}

function getJSONCached(url, callback) {
    const errorFunction = (f) => f()

    if (localStorage[url] !== undefined) {
        requestAnimationFrame(() => callback(JSON.parse(localStorage[url])))
    } else {
        $.getJSON(url, (result) => {
            localStorage[url] = JSON.stringify(result)
            callback(result)
        })
    }

    return { error: errorFunction }
}

function randomTask() {
    $('#modal_bg').hide();
    var subset = "training";
    getJSONCached("https://api.github.com/repos/fchollet/ARC/contents/data/" + subset, function(tasks) {
        var task_index = Math.floor(Math.random() * tasks.length)
        var task = tasks[task_index];
        getJSONCached(task["download_url"], function(json) {
            try {
                train = json['train'];
                test = json['test'];
            } catch (e) {
                errorMsg('Bad file format');
                return;
            }
            loadJSONTask(train, test);
            //$('#load_task_file_input')[0].value = "";
            infoMsg("Loaded task training/" + task["name"]);
            display_task_name(task['name'], task_index, tasks.length);
        })
        .error(function(){
          errorMsg('Error loading task');
        });
    })
    .error(function(){
      errorMsg('Error loading task list');
    });
}

function prevTask() {
    var subset = "training";
    getJSONCached("https://api.github.com/repos/fchollet/ARC/contents/data/" + subset, function(tasks) {
        var old_index = tasks.findIndex(task => task.name === current_task_name)
        var task_index
        if (current_task_name === undefined) {
            task_index = 0
        } else if (old_index === 0) {
            return
        } else {
            task_index = old_index - 1
        }

        var task = tasks[task_index];
        getJSONCached(task["download_url"], function(json) {
            try {
                train = json['train'];
                test = json['test'];
            } catch (e) {
                errorMsg('Bad file format');
                return;
            }
            loadJSONTask(train, test);
            //$('#load_task_file_input')[0].value = "";
            infoMsg("Loaded task training/" + task["name"]);
            display_task_name(task['name'], task_index, tasks.length);
        })
        .error(function(){
          errorMsg('Error loading task');
        });
    })
    .error(function(){
      errorMsg('Error loading task list');
    });
}

function nextTask() {
    var subset = "training";
    getJSONCached("https://api.github.com/repos/fchollet/ARC/contents/data/" + subset, function(tasks) {
        var old_index = tasks.findIndex(task => task.name === current_task_name)
        var task_index
        if (current_task_name === undefined) {
            task_index = 0
        } else if (old_index === tasks.length - 1) {
            alert("Completed all tasks! Restarting from the beginning")
            task_index = 0
        } else {
            task_index = old_index + 1
        }

        var task = tasks[task_index];
        getJSONCached(task["download_url"], function(json) {
            try {
                train = json['train'];
                test = json['test'];
            } catch (e) {
                errorMsg('Bad file format');
                return;
            }
            loadJSONTask(train, test);
            //$('#load_task_file_input')[0].value = "";
            infoMsg("Loaded task training/" + task["name"]);
            display_task_name(task['name'], task_index, tasks.length);
        })
        .error(function(){
          errorMsg('Error loading task');
        });
    })
    .error(function(){
      errorMsg('Error loading task list');
    });
}

function loadTaskFrom({ task_name, task_index }) {
    var subset = "training";
    getJSONCached("https://api.github.com/repos/fchollet/ARC/contents/data/" + subset, function(tasks) {
        if (task_index === undefined) {
            task_index = tasks.findIndex(task => task.name === task_name)
        }

        if (task_index === -1) {
            alert('no such task ' + JSON.stringify(task_name))
        }

        var task = tasks[task_index];
        getJSONCached(task["download_url"], function(json) {
            try {
                train = json['train'];
                test = json['test'];
            } catch (e) {
                errorMsg('Bad file format');
                return;
            }
            loadJSONTask(train, test);
            //$('#load_task_file_input')[0].value = "";
            infoMsg("Loaded task training/" + task["name"]);
            display_task_name(task['name'], task_index, tasks.length);
        })
        .error(function(){
          errorMsg('Error loading task');
        });
    })
    .error(function(){
      errorMsg('Error loading task list');
    });
}

function goToIndex(task_index = 0) {
    var subset = "training";
    getJSONCached("https://api.github.com/repos/fchollet/ARC/contents/data/" + subset, function(tasks) {
        var task = tasks[task_index];
        getJSONCached(task["download_url"], function(json) {
            try {
                train = json['train'];
                test = json['test'];
            } catch (e) {
                errorMsg('Bad file format');
                return;
            }
            loadJSONTask(train, test);
            //$('#load_task_file_input')[0].value = "";
            infoMsg("Loaded task training/" + task["name"]);
            display_task_name(task['name'], task_index, tasks.length);
        })
        .error(function(){
          errorMsg('Error loading task');
        });
    })
    .error(function(){
      errorMsg('Error loading task list');
    });
}

function goToIndexInInput() {
    var task_index = Number(document.querySelector('[name=task_index]').value)
    goToIndex(task_index)
}

function nextTestInput() {
    if (TEST_PAIRS.length <= CURRENT_TEST_PAIR_INDEX + 1) {
        errorMsg('No next test input. Pick another file?')
        return
    }
    CURRENT_TEST_PAIR_INDEX += 1;
    values = TEST_PAIRS[CURRENT_TEST_PAIR_INDEX]['input'];
    CURRENT_INPUT_GRID = convertSerializedGridToGridObject(values)
    fillTestInput(CURRENT_INPUT_GRID);
    $('#current_test_input_id_display').html(CURRENT_TEST_PAIR_INDEX + 1);
    $('#total_test_input_count_display').html(test.length);
}

function submitSolution() {
    syncFromEditionGridToDataGrid();
    reference_output = TEST_PAIRS[CURRENT_TEST_PAIR_INDEX]['output'];
    submitted_output = CURRENT_OUTPUT_GRID.grid;
    if (reference_output.length != submitted_output.length) {
        errorMsg('Wrong solution.');
        return
    }
    for (var i = 0; i < reference_output.length; i++){
        ref_row = reference_output[i];
        for (var j = 0; j < ref_row.length; j++){
            if (ref_row[j] != submitted_output[i][j]) {
                errorMsg('Wrong solution.');
                return
            }
        }

    }
    infoMsg('Correct solution!');
}

function fillTestInput(inputGrid) {
    jqInputGrid = $('#evaluation_input');
    fillJqGridWithData(jqInputGrid, inputGrid);
    fitCellsToContainer(jqInputGrid, inputGrid.height, inputGrid.width, 400, 400);
}

function copyToOutput() {
    syncFromEditionGridToDataGrid();
    CURRENT_OUTPUT_GRID = convertSerializedGridToGridObject(CURRENT_INPUT_GRID.grid);
    syncFromDataGridToEditionGrid();
    $('#output_grid_size').val(CURRENT_OUTPUT_GRID.height + 'x' + CURRENT_OUTPUT_GRID.width);
}

function initializeSelectable() {
    try {
        $('.selectable_grid').selectable('destroy');
    }
    catch (e) {
    }
    toolMode = $('input[name=tool_switching]:checked').val();
    if (toolMode == 'select') {
        infoMsg('Select some cells and click on a color to fill in, or press C to copy');
        $('.selectable_grid').selectable({
            autoRefresh: false,
            filter: '> .row > .cell',
            start: function(event, ui) {
                $('.ui-selected').each(function(i, e) {
                    $(e).removeClass('ui-selected');
                });
            },
        });
    } else if (toolMode == 'multiselect') {
        infoMsg('Select some cells, and they will be filled automatically with the selected symbol');
        $('.selectable_grid').selectable({
            autoRefresh: false,
            filter: '> .row > .cell',
            stop: function(event, ui) {
                let symbol = getSelectedSymbol();
                $('.ui-selected').each(function(i, cell) {
                    setCellSymbol($(cell), symbol);
                });
            },
        });
    }
}

// Initial event binding.

$(document).ready(function () {
    $('#symbol_picker').find('.symbol_preview').click(function(event) {
        symbol_preview = $(event.target);
        $('#symbol_picker').find('.symbol_preview').each(function(i, preview) {
            $(preview).removeClass('selected-symbol-preview');
        })
        symbol_preview.addClass('selected-symbol-preview');

        toolMode = $('input[name=tool_switching]:checked').val();
        if (toolMode == 'select') {
            $('.edition_grid').find('.ui-selected').each(function(i, cell) {
                symbol = getSelectedSymbol();
                setCellSymbol($(cell), symbol);
            });
        }
    });

    $('.edition_grid').each(function(i, jqGrid) {
        setUpEditionGridListeners($(jqGrid));
    });

    $('.load_task').on('change', function(event) {
        loadTaskFromFile(event);
    });

    $('.load_task').on('click', function(event) {
      event.target.value = "";
    });

    $('input[type=radio][name=tool_switching]').change(function() {
        initializeSelectable();
    });
    
    $('input[type=text][name=size]').on('keydown', function(event) {
        if (event.keyCode == 13) {
            resizeOutputGrid();
        }
    });

    $('body').keydown(function(event) {
        // Copy and paste functionality.
        if (event.which == 67) {
            // Press C

            selected = $('.ui-selected');
            if (selected.length == 0) {
                return;
            }

            COPY_PASTE_DATA = [];
            for (var i = 0; i < selected.length; i ++) {
                x = parseInt($(selected[i]).attr('x'));
                y = parseInt($(selected[i]).attr('y'));
                symbol = parseInt($(selected[i]).attr('symbol'));
                COPY_PASTE_DATA.push([x, y, symbol]);
            }
            infoMsg('Cells copied! Select a target cell and press V to paste at location.');

        }
        if (event.which == 86) {
            // Press P
            if (COPY_PASTE_DATA.length == 0) {
                errorMsg('No data to paste.');
                return;
            }
            selected = $('.edition_grid').find('.ui-selected');
            if (selected.length == 0) {
                errorMsg('Select a target cell on the output grid.');
                return;
            }

            jqGrid = $(selected.parent().parent()[0]);

            if (selected.length == 1) {
                targetx = parseInt(selected.attr('x'));
                targety = parseInt(selected.attr('y'));

                xs = new Array();
                ys = new Array();
                symbols = new Array();

                for (var i = 0; i < COPY_PASTE_DATA.length; i ++) {
                    xs.push(COPY_PASTE_DATA[i][0]);
                    ys.push(COPY_PASTE_DATA[i][1]);
                    symbols.push(COPY_PASTE_DATA[i][2]);
                }

                minx = Math.min(...xs);
                miny = Math.min(...ys);
                for (var i = 0; i < xs.length; i ++) {
                    x = xs[i];
                    y = ys[i];
                    symbol = symbols[i];
                    newx = x - minx + targetx;
                    newy = y - miny + targety;
                    res = jqGrid.find('[x="' + newx + '"][y="' + newy + '"] ');
                    if (res.length == 1) {
                        cell = $(res[0]);
                        setCellSymbol(cell, symbol);
                    }
                }
            } else {
                errorMsg('Can only paste at a specific location; only select *one* cell as paste destination.');
            }
        }
    });
});

let easyTaskIndex = 0
easyTasks = [
    [ '6d0aefbc.json', 0.7741935483870968, 62 ],
    [ '67e8384a.json', 0.5652173913043478, 23 ],
    [ '2dc579da.json', 0.4748201438848921, 139 ],
    [ 'e9afcf9a.json', 0.45977011494252873, 87 ],
    [ '25ff71a9.json', 0.2857142857142857, 35 ],
    [ '6773b310.json', 0.19491525423728814, 118 ],
    [ '44f52bb0.json', 0.18115942028985507, 138 ],
    [ 'ded97339.json', 0.1794871794871795, 39 ],
    [ 'b60334d2.json', 0.15, 20 ],
    [ '4258a5f9.json', 0.1, 20 ],
    [ '2013d3e2.json', 0.09523809523809523, 21 ],
    [ '5614dbcf.json', 0.08695652173913043, 23 ],
    [ '49d1d64f.json', 0.08333333333333333, 24 ],
    [ '95990924.json', 0.08, 25 ],
    [ 'b91ae062.json', 0.07692307692307693, 26 ],
    [ '32597951.json', 0.06666666666666667, 30 ],
    [ 'be94b721.json', 0.05660377358490566, 53 ],
    [ 'd037b0a7.json', 0.056179775280898875, 89 ],
    [ '017c7c7b.json', 0.05405405405405406, 37 ],
    [ 'bdad9b1f.json', 0.05357142857142857, 56 ],
    [ 'd631b094.json', 0.05, 20 ],
    [ 'd364b489.json', 0.05, 20 ],
    [ 'aedd82e4.json', 0.05, 20 ],
    [ 'ba97ae07.json', 0.038461538461538464, 26 ],
    [ '3bd67248.json', 0.03508771929824561, 57 ],
    [ 'a87f7484.json', 0.034482758620689655, 29 ],
    [ '74dd1130.json', 0.034482758620689655, 29 ],
    [ '68b16354.json', 0.022222222222222223, 45 ],
    [ '28bf18c6.json', 0.014925373134328358, 67 ],
    [ '6150a2bd.json', 0.0136986301369863, 73 ],
]

console.log('there')
window.onload = () => {
    console.log('here')
    document.body.addEventListener('keydown', (e) => {
        console.log(e)
        if (e.key.toLowerCase() === 'l') {
            e.preventDefault()
            e.stopPropagation()
            const task = easyTasks[easyTaskIndex]
            console.log('easy task', easyTaskIndex, task)
            easyTaskIndex += 1
            loadTaskFrom({ "task_name": task[0] })
            // const taskName = prompt('Enter task name')
            // if (taskName !== null) {
            //     loadTaskFrom(taskName)
            // }
        } else if (e.key.toLowerCase() === 'o') {
            e.preventDefault()
            e.stopPropagation()
            const taskName = prompt('Enter task name')
            if (taskName !== null) {
                loadTaskFrom(taskName)
            }
        } else if ([ 'ArrowLeft', 'ArrowUp' ].includes(e.key)) {
            console.log(1)
            e.preventDefault()
            e.stopPropagation()
            prevTask()
        } else if ([ 'ArrowRight', 'ArrowDown' ].includes(e.key)) {
            console.log(2)
            e.preventDefault()
            e.stopPropagation()
            nextTask()
        }
    })
}

window.addEventListener('load', () => {
    const params = new URL(location).searchParams
    if (params.get('problem_index')) {
        document.getElementById('modal_bg').style.display = 'none';
        $('#modal_bg').hide();
        console.log(1);
        const index = Number(params.get('problem_index'))
        console.log(2);
        loadTaskFrom({ "task_index": index });
        console.log(3);
        console.log('hide');
    }

    requestAnimationFrame(() => {
        document.body.style.display = 'block'
    });

    getJSONCached("https://api.github.com/repos/fchollet/ARC/contents/data/training", (tasks) => {
        for (const task of tasks) {
            setInterval((() => getJSONCached(task['download_url'], () => {})), 300)
        }
    });
})
